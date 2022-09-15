import {Injectable, Logger} from '@nestjs/common'
import {AppService} from '../../../app.service'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {ResellerSearchDto} from '../dto/reseller-search.dto'
import {IsNull, SelectQueryBuilder} from 'typeorm'
import {db, internal} from '../../../entities'
import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {ResellersRepository} from '../interfaces/resellers.repository'

@Injectable()
export class ResellersMariadbRepository implements ResellersRepository {
    private readonly log = new Logger(ResellersMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleDbErrors
    async createEmailTemplates(resellerId: number) {
        this.log.debug({
            message: 'create email templates',
            func: this.createEmailTemplates.name,
            resellerId: resellerId,
        })
        const defaultTemplates = await this.findDefaultEmailTemplates()
        defaultTemplates.forEach(template => {
            delete template.id
            template.reseller_id = resellerId
            db.billing.EmailTemplate.insert(template)
        })
    }

    @HandleDbErrors
    async findDefaultEmailTemplates(): Promise<db.billing.EmailTemplate[]> {
        return await db.billing.EmailTemplate.find(
            {
                where: {
                    reseller_id: IsNull(),
                },
            },
        )
    }

    @HandleDbErrors
    async create(reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'create reseller', func: this.create.name, user: sr.user.username})
        const r = db.billing.Reseller.create(reseller)
        // TODO: Transaction guard
        const result = await r.save()
        return result.toInternal()
    }

    @HandleDbErrors
    async terminate(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete reseller by id', func: this.terminate.name, id: id})
        let reseller = await db.billing.Reseller.findOneOrFail(id)
        reseller = await db.billing.Reseller.merge(reseller, {status: ResellerStatus.Terminated})
        await db.billing.Reseller.update(reseller.id, reseller)
        return 1
    }

    @HandleDbErrors
    async read(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.read.name, user: sr.user.username, id: id})
        return (await db.billing.Reseller.findOneOrFail(id)).toInternal()
    }

    @HandleDbErrors
    async readByName(name: string, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.readByName.name, user: sr.user.username, name: name})
        return await db.billing.Reseller.findOne({where: {name: name}})
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        this.log.debug({
            message: 'read all resellers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = await this.createReadAllQueryBuilder(sr)

        const [result, count] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), count]
    }

    @HandleDbErrors
    async update(id: number, reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'update reseller by id', func: this.update.name, user: sr.user.username, id: id})
        const update = new db.billing.Reseller().fromInternal(reseller)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.billing.Reseller.update(id, update)
        return await this.read(id, sr)
    }

    @HandleDbErrors
    async resellerWithContractExists(contractId: number): Promise<boolean> {
        const resellers = await db.billing.Reseller.find({where: {contract_id: contractId}})
        return resellers.length != 0
    }

    @HandleDbErrors
    async contractExists(contractId: number): Promise<boolean> {
        const contract = await db.billing.Contract.findOne(contractId)
        return contract != undefined
    }

    @HandleDbErrors
    async contractHasSystemContact(contractId: number): Promise<boolean> {
        const contract = await db.billing.Contract.findOne(contractId, {relations: ['contact']})
        return contract.contact.reseller_id == undefined
    }

    @HandleDbErrors
    async renameReseller(id: number, name: string) {
        await db.billing.Reseller.update(id, {name: `old_${id}_${name}`})
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = db.billing.Reseller.createQueryBuilder('reseller')
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Reseller>> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new ResellerSearchDto())))
        return qb
    }
}
