import {ForbiddenException, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {ResellerCreateDto} from './dto/reseller-create.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, Operation} from 'fast-json-patch'
import {ResellerBaseDto} from './dto/reseller-base.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RBAC_ROLES} from '../../config/constants.config'
import {AppService} from '../../app.service'
import {db} from '../../entities'
import {FindManyOptions, IsNull} from 'typeorm'

enum ResellerError {
    ContractExists = 'invalid \'contract_id\', reseller with this contract already exists',
    NameExists = 'invalid \'name\', reseller with this name already exists',
    ContractNotFound = 'invalid \'contract_id\'',

    ContractInvalidLink = 'invalid \'contract_id\', linking to a customer contact',

    // TODO: Can these conditions even occur?
    ResellerInvalidId = 'reseller ID other than the user\'s reseller ID is not allowed',
    ResellerUndefinedId = 'undefined reseller ID is not allowed',

    // TODO: What is the difference of both? I don't think that we need to check this because it can be solved on controller level
    ResellerCreateInvalidAssociation = 'creating items associated with a reseller is allowed for admin and reseller users only',
    ResellerUpdateInvalidAssociation = 'updating items associated with a reseller is allowed for admin and reseller users only',

    // TODO: What is the difference of both?
    ChangeIdForbidden = 'changing the reseller ID is not allowed',
    ResellerSetIdForbidden = 'cannot set the reseller Id if it was unset before',

    ChangeUnassociatedForbidden = 'updating items not associated with a reseller is not allowed'
}

enum ResellerStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

@Injectable()
export class ResellersService implements CrudService<ResellerCreateDto, ResellerResponseDto> {
    constructor(
        private readonly app: AppService,
    ) {
    }

    // TODO: should toResponse be private as it is an internal helper func?
    toResponse(d: db.billing.Reseller): ResellerResponseDto {
        return {
            contract_id: d.contract_id,
            id: d.id,
            name: d.name,
            status: d.status,
        }
    }

    async createEmailTemplates(reseller_id: number) {
        const pattern: FindManyOptions = {
            where: {
                reseller_id: IsNull(),
            },
        }
        let defaultTemplates = await db.billing.EmailTemplate.find(pattern)
        defaultTemplates.forEach(template => {
            delete template.id
            template.reseller_id = reseller_id
            db.billing.EmailTemplate.insert(template)
        })
    }

    @HandleDbErrors
    async create(dto: ResellerCreateDto, req: ServiceRequest): Promise<ResellerResponseDto> {
        const r = db.billing.Reseller.create(dto)
        // TODO: Transaction guard
        let result: db.billing.Reseller
        await this.validateCreate(dto)
        const resellerOld = await db.billing.Reseller.findOne({where: {name: dto.name}})
        if (resellerOld) {
            await this.renameIfTerminated(resellerOld)
        }
        //result = await this.resellerRepo.create<Reseller>(r)
        result = await r.save()
        await this.createEmailTemplates(result.id)
        // TODO: add rtc part
        return this.toResponse(result)
    }

    // TODO: could we use DELETE to terminate resellers?
    @HandleDbErrors
    async delete(id: number): Promise<number> {
        let reseller = await db.billing.Reseller.findOneOrFail(id)
        reseller = await db.billing.Reseller.merge(reseller, {status: ResellerStatus.Terminated})
        await db.billing.Reseller.update(reseller.id, reseller)
        return 1
    }

    @HandleDbErrors
    async read(id: number): Promise<ResellerResponseDto> {
        return this.toResponse(await db.billing.Reseller.findOneOrFail(id))
    }

    @HandleDbErrors
    async readAll(page: number, rows: number): Promise<ResellerResponseDto[]> {
        const result = await db.billing.Reseller.find(
            {take: +rows, skip: +rows * (+page - 1)},
        )
        return result.map(r => this.toResponse(r))
    }

    @HandleDbErrors
    async update(id: number, reseller: ResellerCreateDto, req: ServiceRequest): Promise<ResellerResponseDto> {
        await db.billing.Reseller.findOneOrFail(id)
        await this.validateUpdate(id, reseller, req)
        return this.toResponse(await this.save(id, reseller))
    }

    @HandleDbErrors
    async adjust(id: number, patch: Operation[], req: ServiceRequest): Promise<ResellerResponseDto> {
        let reseller: ResellerBaseDto

        let entry = await db.billing.Reseller.findOneOrFail(id)

        reseller = this.deflate(entry)
        // TODO: check if id could be changed with patch
        reseller = applyPatch(reseller, patch).newDocument
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
        let resellers = await db.billing.Reseller.find({where: {contract_id: r.contract_id}})

        if (resellers.length != 0) {
            throw new UnprocessableEntityException(ResellerError.ContractExists)
        }

        //TODO: Get Contracts from ORM association
        let contract = await db.billing.Contract.findOne(r.contract_id, {relations: ['contact']})
        if (!contract) {
            throw new UnprocessableEntityException(ResellerError.ContractNotFound)
        }
        if (contract.contact.reseller_id) {
            throw new UnprocessableEntityException(ResellerError.ContractInvalidLink)
        }

    }

    private async validateUpdate(id: number, newReseller: ResellerBaseDto, req: ServiceRequest): Promise<boolean> {
        const oldReseller = await db.billing.Reseller.findOneOrFail(id)

        // TODO: check if there is a case where IDs could differ - I think this check is redundant
        if (req.user.role === RBAC_ROLES.admin) {
            if (oldReseller.id != id) {
                // TODO: check if HTTP Status code should be 422 UnprocessableEntity; or Forbidden
                throw new UnprocessableEntityException(ResellerError.ChangeIdForbidden)
            }
        }

        if (req.user.role === RBAC_ROLES.reseller) {
            if (req.user.reseller_id != id) {
                throw new ForbiddenException(ResellerError.ChangeUnassociatedForbidden)
            }
        }

        if (oldReseller.contract_id != newReseller.contract_id) {
            if (db.billing.Reseller.find({where: {contract_id: newReseller.contract_id}})) {
                throw new UnprocessableEntityException(ResellerError.ContractExists)
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

    private async renameIfTerminated(entry: db.billing.Reseller) {
        if (entry.status === ResellerStatus.Terminated) {
            entry = await db.billing.Reseller.merge(entry, {name: `old_${entry.id}_${entry.name}`})
            await entry.save()
        } else {
            new UnprocessableEntityException(ResellerError.NameExists)
        }
    }
}