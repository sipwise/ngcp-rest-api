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
    authorized = ['Old', 'INBOX', 'Work', 'Friends', 'Family', 'Cust1', 'Cust2', 'Cust3', 'Cust4', 'Cust5', 'Cust6']
    private readonly log = new LoggerService(VoicemailService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(VoicemailMariadbRepository) private readonly voicemailRepo: VoicemailMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return this.voicemailRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        return this.voicemailRepo.read(id, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        return await this.voicemailRepo.delete(ids, sr)
    }

    async update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        if (await this.voicemailRepo.readCountOfIds(ids, sr) != ids.length)
            throw new UnprocessableEntityException()
        const notifies: Array<internal.Voicemail> = []
        for (const id of ids) {
            const update = updates[id]
            if (this.authorized.indexOf(update.dir) == -1) {
                throw new BadRequestException(`not a valid value dir=${update.dir}`)
            }
            const voicemail = await this.voicemailRepo.read(id, sr)
            const dir = voicemail.dir.substring(voicemail.dir.lastIndexOf('/') + 1)
            const sendVmnotify: boolean = update.dir && update.dir != dir
            update.dir = `${this.voicemailDir}${voicemail.mailboxuser}/${update.dir}`

            if (sendVmnotify)
                notifies.push(voicemail)
        }

        const result = await this.voicemailRepo.update(updates, sr)

        for (const voicemail of notifies) {
            const messagesCount = await this.voicemailRepo.readMessagesCountByUUID(voicemail.mailboxuser, sr)
            const cli = voicemail.username
            const uuid = voicemail.mailboxuser
            const context = 'default'
            const new_messages = messagesCount.new_messages.toString()
            const old_messages = messagesCount.old_messages.toString()
            this.log.debug({
                message: `send vmnotify with args context=${context} cli=${cli} uuid=${uuid} new_messages=${new_messages} old_messages=${old_messages}`,
                func: this.readAll.name,
                user: sr.user.username,
            })
            const args = [context, cli, uuid, new_messages, old_messages]
            await execFileAsync('/usr/bin/ngcp-vmnotify', args, {cwd: '/usr/bin', shell: false, timeout: 5 * 1000},
            ).then(async (ret) => {
                return true
            }).catch(error => {
                this.log.error(`execFileAsync ${error.cmd} error: ${error.stdout}, ${error.stderr}`)
                throw new UnprocessableEntityException(this.i18n.t('errors.REQUEST_PROCESSING_ERROR'))
            })
        }

        return result
    }
}
