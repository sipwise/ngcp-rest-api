import {ForbiddenException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {ResellerCreateDto} from './dto/reseller-create.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, Operation} from '../../helpers/patch.helper'
import {ResellerBaseDto, ResellerStatus} from './dto/reseller-base.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RBAC_ROLES} from '../../config/constants.config'
import {AppService} from '../../app.service'
import {db} from '../../entities'
import {FindManyOptions, IsNull} from 'typeorm'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import {ResellerSearchDto} from './dto/reseller-search.dto'
import {Messages} from '../../config/messages.config'

enum ResellerError {
    // TODO: Can these conditions even occur?
    ResellerInvalidId = 'reseller ID other than the user\'s reseller ID is not allowed',
    ResellerUndefinedId = 'undefined reseller ID is not allowed',

    // TODO: What is the difference of both? I don't think that we need to check this because it can be solved on controller level
    ResellerCreateInvalidAssociation = 'creating items associated with a reseller is allowed for admin and reseller users only',
    ResellerUpdateInvalidAssociation = 'updating items associated with a reseller is allowed for admin and reseller users only',

    // TODO: What is the difference of both?
    ChangeIdForbidden = 'changing the reseller ID is not allowed',
    ResellerSetIdForbidden = 'cannot set the reseller Id if it was unset before',
}

@Injectable()
export class ResellersService implements CrudService<ResellerCreateDto, ResellerResponseDto> {
    private readonly log = new Logger(ResellersService.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    // TODO: should toResponse be private as it is an internal helper func?
    toResponse(d: db.billing.Reseller): ResellerResponseDto {
        return {
            id: d.id,
            contract_id: d.contract_id,
            name: d.name,
            status: d.status,
        }
    }

    async createEmailTemplates(reseller_id: number) {
        this.log.debug({message: 'create email templates', func: this.update.name, id: reseller_id})
        const pattern: FindManyOptions<db.billing.EmailTemplate> = {
            where: {
                reseller_id: IsNull(),
            },
        }
        const defaultTemplates = await db.billing.EmailTemplate.find(pattern)
        defaultTemplates.forEach(template => {
            delete template.id
            template.reseller_id = reseller_id
            db.billing.EmailTemplate.insert(template)
        })
    }

    @HandleDbErrors
    async create(dto: ResellerCreateDto, req: ServiceRequest): Promise<ResellerResponseDto> {
        this.log.debug({message: 'create reseller', func: this.create.name, user: req.user.username})
        const r = db.billing.Reseller.create(dto)
        // TODO: Transaction guard
        await this.validateCreate(dto)
        const resellerOld = await db.billing.Reseller.findOne({where: {name: dto.name}})
        if (resellerOld) {
            if (!await this.renameIfTerminated(resellerOld)) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.NAME_EXISTS, req))
            }
        }
        const result = await r.save()
        await this.createEmailTemplates(result.id)
        // TODO: add rtc part
        return this.toResponse(result)
    }

    // TODO: could we use DELETE to terminate resellers?
    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete reseller by id', func: this.delete.name, id: id})
        let reseller = await db.billing.Reseller.findOneOrFail(id)
        reseller = await db.billing.Reseller.merge(reseller, {status: ResellerStatus.Terminated})
        await db.billing.Reseller.update(reseller.id, reseller)
        return 1
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<ResellerResponseDto> {
        this.log.debug({message: 'read reseller by id', func: this.read.name, user: req.user.username, id: id})
        return this.toResponse(await db.billing.Reseller.findOneOrFail(id))
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<[ResellerResponseDto[], number]> {
        this.log.debug({
            message: 'read all resellers',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })
        const queryBuilder = db.billing.Reseller.createQueryBuilder('reseller')
        const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
        await configureQueryBuilder(queryBuilder, req.query,
        {searchableFields: resellerSearchDtoKeys, rows: +rows, page: +page})
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(r => this.toResponse(r)), totalCount]
    }

    @HandleDbErrors
    async update(id: number, reseller: ResellerCreateDto, req: ServiceRequest): Promise<ResellerResponseDto> {
        this.log.debug({message: 'update reseller by id', func: this.update.name, user: req.user.username, id: id})
        await db.billing.Reseller.findOneOrFail(id)
        await this.validateUpdate(id, reseller, req)
        return this.toResponse(await this.save(id, reseller))
    }

    @HandleDbErrors
    async adjust(id: number, patch: Operation | Operation[], req: ServiceRequest): Promise<ResellerResponseDto> {
        this.log.debug({message: 'adjust reseller by id', func: this.adjust.name, user: req.user.username, id: id})
        let reseller: ResellerBaseDto

        const entry = await db.billing.Reseller.findOneOrFail(id)

        reseller = this.deflate(entry)
        reseller = applyPatch(reseller, patch).newDocument
        // TODO: add reseller validity check here, no idea how to do that here
        await this.validateUpdate(id, reseller, req)

        return this.toResponse(await this.save(id, reseller))
    }

    private inflate(dto: ResellerBaseDto): db.billing.Reseller {
        return Object.assign(dto)
    }

    private deflate(entry: db.billing.Reseller): ResellerBaseDto {
        return Object.assign(entry)
    }

    private async validateCreate(r: ResellerBaseDto) {
        const resellers = await db.billing.Reseller.find({where: {contract_id: r.contract_id}})

        if (resellers.length != 0) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_EXISTS))
        }

        //TODO: Get Contracts from ORM association
        const contract = await db.billing.Contract.findOne(r.contract_id, {relations: ['contact']})
        if (!contract) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_NOT_FOUND))
        }
        if (contract.contact.reseller_id) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_INVALID_LINK))
        }

    }

    private async validateUpdate(id: number, newReseller: ResellerBaseDto, req: ServiceRequest): Promise<boolean> {
        const oldReseller = await db.billing.Reseller.findOneOrFail(id)
        // TODO: check if there is a case where IDs could differ - I think this check is redundant
        if (req.user.role === RBAC_ROLES.admin) {
            if (oldReseller.id != id) {
                // TODO: check if HTTP Status code should be 422 UnprocessableEntity; or Forbidden
                throw new UnprocessableEntityException(Messages.invoke(Messages.CHANGE_ID_FORBIDDEN, req))
            }
        }

        if (req.user.role === RBAC_ROLES.reseller) {
            if (req.user.reseller_id != id) {
                throw new ForbiddenException(Messages.invoke(Messages.CHANGE_UNASSOCIATED_FORBIDDEN, req))
            }
        }

        // check if reseller with new contract_id already exists
        if (oldReseller.contract_id != newReseller.contract_id) {
            if (await db.billing.Reseller.find({where: {contract_id: newReseller.contract_id}})) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_EXISTS, req))
            }
        }

        // check if reseller with new name already exists
        if (oldReseller.name != newReseller.name) {
            const res = await db.billing.Reseller.find({where: {name: newReseller.name}})
            if (res.length != 0) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.NAME_EXISTS, req))
            }
        }
        return true
    }

    private async save(id: number, reseller: ResellerBaseDto): Promise<db.billing.Reseller> {
        let entry = await db.billing.Reseller.findOneOrFail(id)

        entry = await db.billing.Reseller.merge(entry, reseller)
        await db.billing.Reseller.update(entry.id, entry)

        return entry
    }

    // TODO: handle reseller status change

    /**
     * Rename reseller if it is terminated
     * @param entry
     * @private
     * @returns true if reseller was renamed else false
     */
    private async renameIfTerminated(entry: db.billing.Reseller): Promise<boolean> {
        if (entry.status === ResellerStatus.Terminated) {
            entry = await db.billing.Reseller.merge(entry, {name: `old_${entry.id}_${entry.name}`})
            await entry.save()
            return true
        }
        return false
    }
}
