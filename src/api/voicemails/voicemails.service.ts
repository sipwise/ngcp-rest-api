import {BadRequestException, Injectable} from '@nestjs/common'
import {internal} from '../../entities'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {VoicemailsMariadbRepository} from './repositories/voicemails.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class VoicemailsService implements CrudService<internal.Voicemail> {
    readonly voicemailDir = '/var/spool/asterisk/voicemail/default/'
    authorized = ['Old', 'INBOX', 'Work', 'Friends', 'Family', 'Cust1', 'Cust2', 'Cust3', 'Cust4', 'Cust5', 'Cust6']
    private readonly log = new LoggerService(VoicemailsService.name)

    constructor(
        private readonly voicemailsRepo: VoicemailsMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return this.voicemailsRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        return this.voicemailsRepo.read(id, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        return await this.voicemailsRepo.delete(id, sr)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Voicemail> {
        let voicemail = await this.voicemailsRepo.read(id, sr)

        // TODO: changing the path only works if /folder is at index 0
        if (Array.isArray(patch)) {
            if (patch[0].path === '/folder')
                patch[0].path = '/dir'
        } else {
            if (patch.path === '/folder')
                patch.path = '/dir'
        }
        voicemail = applyPatch(voicemail, patch).newDocument
        if (this.authorized.indexOf(voicemail.dir) == -1) {
            throw new BadRequestException('not a valid entry (value)')
        }
        voicemail.dir = this.voicemailDir + voicemail.mailboxuser + '/' + voicemail.dir
        return await this.voicemailsRepo.update(id, voicemail, sr)
    }

    async update(id: number, update: internal.Voicemail, sr: ServiceRequest): Promise<internal.Voicemail> {
        const voicemail = await this.voicemailsRepo.read(id, sr)
        voicemail.dir = update.dir
        if (this.authorized.indexOf(voicemail.dir) == -1) {
            throw new BadRequestException('not a valid entry (value)')
        }
        voicemail.dir = this.voicemailDir + voicemail.mailboxuser + '/' + voicemail.dir
        return await this.voicemailsRepo.update(id, voicemail, sr)
    }
}
