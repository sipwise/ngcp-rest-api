import {
    ForbiddenException,
    Injectable,
    Logger,
    NotImplementedException,
    UnprocessableEntityException,
} from '@nestjs/common'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {db, internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RbacRole} from '../../config/constants.config'
import {Messages} from '../../config/messages.config'
import {DomainsMariadbRepository} from './repositories/domains.mariadb.repository'
import {DomainCreateDto} from './dto/domain-create.dto'

@Injectable()
export class DomainsService { // implements CrudService<DomainCreateDto, DomainResponseDto> {
    private readonly log = new Logger(DomainsService.name)

    constructor(
        private readonly domainRepo: DomainsMariadbRepository,
    ) {
    }

    async create(domain: internal.Domain, req: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'create domain',
            func: this.create.name,
            user: req.user.username,
        })
        if (RbacRole.reseller == req.user.role) {
            domain.reseller_id = req.user.reseller_id
        }

        // check if reseller exists
        // TODO: replace with reseller repository
        await db.billing.Reseller.findOneOrFail(domain.reseller_id)

        const result = await this.domainRepo.readByDomain(domain.domain, req)
        if (!result == undefined) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.DOMAIN_ALREADY_EXISTS, req, domain.domain))
        }
        return await this.domainRepo.create(domain, req)
    }

    async readAll(req: ServiceRequest): Promise<[internal.Domain[], number]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: req.user.username,
        })
        return (await this.domainRepo.readAll(req))
    }

    async read(id: number, req: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by id',
            func: this.read.name,
            user: req.user.username,
        })
        return await this.domainRepo.readById(id, req)
    }

    async update(id: number, domain: DomainCreateDto, req: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete domain by id',
            func: this.delete.name,
            user: req.user.username,
        })
        const domain = await this.domainRepo.readById(id, req)
        if (RbacRole.reseller == req.user.role && domain.reseller_id != req.user.reseller_id) {
            throw new ForbiddenException(Messages.invoke(Messages.DOMAIN_DOES_NOT_BELONG_TO_RESELLER, req))
        }
        return await this.domainRepo.delete(id, req)
    }
}
