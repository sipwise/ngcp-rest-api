import {BadRequestException, Injectable, Logger} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {db} from '../../entities'
import {FindManyOptions} from 'typeorm'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Operation as PatchOperation, applyPatch} from '../../helpers/patch.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {VoicemailBaseDto} from './dto/voicemail-base.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'

@Injectable()
export class VoicemailsService implements CrudService<VoicemailBaseDto, VoicemailResponseDto>{
    private readonly log = new Logger(VoicemailsService.name)
    readonly voicemailDir = '/var/spool/asterisk/voicemail/default/'
    authorized = ['Old', 'INBOX', 'Work', 'Friends', 'Family', 'Cust1', 'Cust2', 'Cust3', 'Cust4', 'Cust5', 'Cust6']

    toResponse(db: db.kamailio.VoicemailSpool): VoicemailResponseDto {
        const date = new Date(parseInt(db.origtime) * 1000)
        let stringDate = date.toString()
        stringDate = stringDate.split(' ').slice(1, 5).join(' ')
        return {
            caller: db.callerid,
            duration: db.duration,
            folder: db.dir.substring(db.dir.lastIndexOf('/') + 1),
            id: db.id,
            subscriber_id: db.provSubscriber.id,
            time: stringDate,
        }
    }

    async getSubscriberId(uuid: string): Promise<number> {
        const subscriber = await db.billing.VoipSubscriber.findOneOrFail({where: {uuid: uuid}})
        return subscriber.id
    }

    @HandleDbErrors
    async create(voicemail: VoicemailBaseDto, req: ServiceRequest): Promise<VoicemailResponseDto> {
        const dbVoicemail = db.kamailio.VoicemailSpool.create(voicemail)
        await db.kamailio.VoicemailSpool.insert(dbVoicemail)
        this.log.debug({
            message: 'create Voicemail',
            success: true,
            id: dbVoicemail.id,
        })
        return this.toResponse(dbVoicemail)
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<VoicemailResponseDto[]> {
        const option: FindManyOptions = {take: rows, skip: rows * (page - 1), relations: ['provSubscriber']}
        const result = await db.kamailio.VoicemailSpool.find(option)
        return result.map((vm: db.kamailio.VoicemailSpool) => this.toResponse(vm))
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<VoicemailResponseDto> {
        const result = await db.kamailio.VoicemailSpool.findOneOrFail(id, {relations: ['provSubscriber']})
        return this.toResponse(result)
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const toDelete = await db.kamailio.VoicemailSpool.findOneOrFail(id, {relations: ['provSubscriber']})
        await db.kamailio.VoicemailSpool.remove(toDelete)
        return 1
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<VoicemailResponseDto> {
        const old = await db.kamailio.VoicemailSpool.findOneOrFail(id, {relations: ['provSubscriber']})
        let voicemail: VoicemailBaseDto = this.deflate(old)
        if (!Array.isArray(patch)) {
            if (patch.path === '/folder')
                patch.path = '/dir'
        }
        else {
            if (patch[0].path === '/folder')
                patch[0].path = '/dir'
        }
        voicemail = applyPatch(voicemail, patch).newDocument
        const folder = voicemail.dir
        if (this.authorized.indexOf(folder) == -1) {
            throw new BadRequestException('not a valid entry (value)')
        }
        voicemail.dir = this.voicemailDir + voicemail.mailboxuser + '/' + folder
        await db.kamailio.VoicemailSpool.update(id, voicemail)
        return this.toResponse(old)
    }

    @HandleDbErrors
    async update(id: number, voicemail: VoicemailBaseDto, req: ServiceRequest): Promise<VoicemailResponseDto> {
        const oldVoicemail = await db.kamailio.VoicemailSpool.findOneOrFail(id, {relations: ['provSubscriber']})
        if (voicemail.dir === undefined) {
            voicemail.dir = voicemail.folder
        }
        const newVoicemail = db.kamailio.VoicemailSpool.merge(oldVoicemail, voicemail)
        const folder = newVoicemail.dir
        if (this.authorized.indexOf(folder) == -1) {
            throw new BadRequestException('not a valid entry (value)')
        }
        newVoicemail.dir = this.voicemailDir + newVoicemail.mailboxuser + '/' + folder
        await db.kamailio.VoicemailSpool.update(id, newVoicemail)
        return this.toResponse(oldVoicemail)
    }

    private deflate(entry: db.kamailio.VoicemailSpool): VoicemailBaseDto {
        return Object.assign(entry)
    }
}
