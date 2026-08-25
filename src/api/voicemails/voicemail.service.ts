import {execFile} from 'child_process'
import {promisify} from 'util'

import {BadRequestException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'

import {internal} from '~/entities'
import {supportedVoicemailFolders} from '~/enums/supported-voicemail-folders.enum'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'


const execFileAsync = promisify(execFile)

interface VoicemailFolder {
    mailboxuser: string
    dir: string
}

@Injectable()
export class VoicemailService implements CrudService<internal.Voicemail> {
    readonly voicemailDir = '/var/spool/asterisk/voicemail/default/'
    readonly supported_dirs = supportedVoicemailFolders
    private readonly log = new LoggerService(VoicemailService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(VoicemailMariadbRepository) private readonly voicemailRepo: VoicemailMariadbRepository,
    ) {
    }

    async sendNotification(voicemail: internal.Voicemail, sr: ServiceRequest, actionType: string = 'r'): Promise<void> {
        const context: string = 'default'
        const messagesCount = await this.voicemailRepo.readMessagesCountByUUID(voicemail.mailboxuser, sr)
        const new_messages = messagesCount.new_messages.toString()
        const old_messages = messagesCount.old_messages.toString()
        const urgent_messages = '0'
        const cli = voicemail.username
        const from = voicemail.callerid
        const uuid = voicemail.mailboxuser
        const msgnum = voicemail.msgnum.toString()
        const idStr = voicemail.id.toString()
        const duration = voicemail.duration.toString()
        const callId = voicemail.call_id.toString()
        const date = new Date(parseInt(voicemail.origtime) * 1000).toISOString()
        const actions: Array<string> = [actionType, idStr, callId]

        this.log.debug({
            message:
                'send vmnotify with args ' +
                `context=${context} cli=${cli} uuid=${uuid} ` +
                `new_messages=${new_messages} old_messages=${old_messages} ` +
                `urgent_messages=${urgent_messages} ` +
                `msgnum=${msgnum} from=${from} date=${date} ` +
                `duration=${duration} actions=${actions}`,
            func: this.readAll.name,
            user: sr.user.username,
        })

        const args = [
            context, cli, uuid,
            new_messages, old_messages, urgent_messages,
            msgnum, from, date, duration, ...actions,
        ]

        await execFileAsync('/usr/bin/ngcp-vmnotify', args, {cwd: '/usr/bin', shell: false, timeout: 5 * 1000},
        ).then(async (_ret) => {
            return true
        }).catch(error => {
            this.log.error(`execFileAsync ${error.cmd} error: ${error.stdout}, ${error.stderr}`)
            throw new UnprocessableEntityException(this.i18n.t('errors.REQUEST_PROCESSING_ERROR'))
        })
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return this.voicemailRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        return this.voicemailRepo.read(id, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const voicemails: Array<internal.Voicemail> = await this.voicemailRepo.readWhereInIds(ids, sr)
        const folders = this.collectFolders(voicemails)
        const deletedIds: number[] = await this.voicemailRepo.delete(ids, sr)

        for (const folder of folders.values())
            await this.voicemailRepo.renumberDir(folder.mailboxuser, folder.dir, sr)

        for (const voicemail of voicemails)
            await this.sendNotification(voicemail, sr, 'd')

        return deletedIds
    }

    async update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        if (await this.voicemailRepo.readCountOfIds(ids, sr) != ids.length)
            throw new UnprocessableEntityException()
        const notifies: Array<[number, string]> = []
        const originFolders = new Map<string, VoicemailFolder>()
        const nextMsgnums = new Map<string, number>()
        const voicemails: Array<internal.Voicemail> = await this.voicemailRepo.readWhereInIds(ids, sr)

        for (const voicemail of voicemails) {
            const id = voicemail.id
            const update = updates[id]
            const dir = voicemail.dir.substring(voicemail.dir.lastIndexOf('/') + 1)
            const dirDiff: boolean = update.dir && update.dir != dir
            let action_type = 'r'
            if (dirDiff) {
                let validDir = undefined
                this.supported_dirs.forEach((checkDir) => {
                    if (checkDir.toLowerCase() == update.dir.toLowerCase()) {
                        validDir = checkDir
                        return
                    }
                })
                if (!validDir)
                    throw new BadRequestException(`not a valid value ${update.dir}`)
                if (update.dir.toLowerCase() == 'inbox')
                    action_type = 'x'
                const targetDir = `${this.voicemailDir}${voicemail.mailboxuser}/${validDir}`
                update.dir = targetDir

                // the moved message becomes the last one of the destination folder
                const targetKey = this.folderKey(voicemail.mailboxuser, targetDir)
                let msgnum = nextMsgnums.get(targetKey)
                if (msgnum == undefined)
                    msgnum = await this.voicemailRepo.readMaxMsgnumByDir(voicemail.mailboxuser, targetDir, sr) + 1
                update.msgnum = msgnum
                nextMsgnums.set(targetKey, msgnum + 1)

                // the origin folder has to be renumbered to close the hole left behind
                originFolders.set(this.folderKey(voicemail.mailboxuser, voicemail.dir), {
                    dir: voicemail.dir,
                    mailboxuser: voicemail.mailboxuser,
                })
                notifies.push([id, action_type])
            }
        }

        const result = await this.voicemailRepo.update(updates, sr)

        for (const folder of originFolders.values())
            await this.voicemailRepo.renumberDir(folder.mailboxuser, folder.dir, sr)

        for (const [id, action_type] of notifies) {
            const voicemail = await this.voicemailRepo.read(id, sr)
            await this.sendNotification(voicemail, sr, action_type)
        }

        return result
    }

    private folderKey(mailboxuser: string, dir: string): string {
        return `${mailboxuser}|${dir}`
    }

    private collectFolders(voicemails: internal.Voicemail[]): Map<string, VoicemailFolder> {
        const folders = new Map<string, VoicemailFolder>()
        for (const voicemail of voicemails) {
            folders.set(this.folderKey(voicemail.mailboxuser, voicemail.dir), {
                dir: voicemail.dir,
                mailboxuser: voicemail.mailboxuser,
            })
        }
        return folders
    }
}
