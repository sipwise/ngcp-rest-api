import {BadRequestException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {Dictionary} from '../../helpers/dictionary.helper'
import {I18nService} from 'nestjs-i18n'
import {execFile} from 'child_process'
import {promisify} from 'util'

const execFileAsync = promisify(execFile)

@Injectable()
export class VoicemailService implements CrudService<internal.Voicemail> {
    readonly voicemailDir = '/var/spool/asterisk/voicemail/default/'
    readonly supported_dirs = ['Old', 'INBOX', 'Work', 'Friends', 'Family', 'Cust1', 'Cust2', 'Cust3', 'Cust4', 'Cust5', 'Cust6']
    private readonly log = new LoggerService(VoicemailService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(VoicemailMariadbRepository) private readonly voicemailRepo: VoicemailMariadbRepository,
    ) {
    }

    async sendNotification(voicemail: internal.Voicemail, sr: ServiceRequest, actionType: string = 'r') {
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
        ).then(async (ret) => {
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
        const deletedIds: number[] = await this.voicemailRepo.delete(ids, sr)

        for (const voicemail of voicemails)
            await this.sendNotification(voicemail, sr, 'd')

        return deletedIds
    }

    async update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        if (await this.voicemailRepo.readCountOfIds(ids, sr) != ids.length)
            throw new UnprocessableEntityException()
        const notifies: Array<[internal.Voicemail, string]> = []
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
                update.dir = `${this.voicemailDir}${voicemail.mailboxuser}/${validDir}`
                notifies.push([voicemail, action_type])
            }
        }

        const result = await this.voicemailRepo.update(updates, sr)

        for (const [voicemail, action_type] of notifies) {
            await this.sendNotification(voicemail, sr, action_type)
        }

        return result
    }
}
