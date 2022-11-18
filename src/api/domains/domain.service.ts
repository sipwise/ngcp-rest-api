import {
    ForbiddenException,
    Inject,
    Injectable,
    NotImplementedException,
    UnprocessableEntityException,
} from '@nestjs/common'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {db, internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {RbacRole} from '../../config/constants.config'
import {Messages} from '../../config/messages.config'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
import {DomainCreateDto} from './dto/domain-create.dto'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class DomainService implements CrudService<internal.Domain> {
    private readonly log = new LoggerService(DomainService.name)

    constructor(
        @Inject(DomainMariadbRepository) private readonly domainRepo: DomainMariadbRepository,
    ) {
    }

    async create(domain: internal.Domain, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'create domain',
            func: this.create.name,
            user: sr.user.username,
        })
        if (RbacRole.reseller == sr.user.role) {
            domain.reseller_id = sr.user.reseller_id
        }

        // check if reseller exists
        // TODO: replace with reseller repository
        await db.billing.Reseller.findOneByOrFail({ id: domain.reseller_id })

        const result = await this.domainRepo.readByDomain(domain.domain, sr)
        if (!result == undefined) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.DOMAIN_ALREADY_EXISTS, sr, domain.domain))
        }
        return await this.domainRepo.create(domain, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Domain[], number]> {
        this.log.debug({
            message: 'read all domains',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return (await this.domainRepo.readAll(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Domain> {
        this.log.debug({
            message: 'read domain by id',
            func: this.read.name,
            user: sr.user.username,
        })
        return await this.domainRepo.readById(id, sr)
    }

    async update(id: number, domain: DomainCreateDto, sr: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Domain> {
        throw new NotImplementedException()
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({
            message: 'delete domain by id',
            func: this.delete.name,
            user: sr.user.username,
        })
        const domain = await this.domainRepo.readById(id, sr)
        if (RbacRole.reseller == sr.user.role && domain.reseller_id != sr.user.reseller_id) {
            throw new ForbiddenException(Messages.invoke(Messages.DOMAIN_DOES_NOT_BELONG_TO_RESELLER, sr))
        }
        return await this.domainRepo.delete(id, sr)
    }
}
