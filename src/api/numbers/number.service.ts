import {CrudService} from '~/interfaces/crud-service.interface'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {Inject, Injectable} from '@nestjs/common'
import {LoggerService} from '~/logger/logger.service'
import {RbacRole} from '~/config/constants.config'
import {NumberMariadbRepository} from '~/api/numbers/repositories/number.mariadb.repository'

@Injectable()
export class NumberService implements CrudService<internal.VoipNumber> {

    private readonly log = new LoggerService(NumberService.name)

    constructor(
        @Inject(NumberMariadbRepository) private readonly numberRepo: NumberMariadbRepository,
    ) {
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipNumber> {
        this.log.debug({
            message: 'read customer number by id',
            id: id,
            func: this.readAll.name,
            user: sr.user.username,
        })
        if (sr.user.role == RbacRole.subscriberadmin) {
            return await this.numberRepo.readById(id, sr, {customerId: sr.user.customer_id})
        }
        if (sr.user.role == RbacRole.ccare || sr.user.role == RbacRole.reseller) {
            return await this.numberRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        }
        return await this.numberRepo.readById(id, sr )
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipNumber[], number]> {
        this.log.debug({
            message: 'read all customer numbers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        if (sr.user.role == RbacRole.subscriberadmin) {
            return await this.numberRepo.readAll(sr, {customerId: sr.user.customer_id})
        }
        if (sr.user.role == RbacRole.ccare || sr.user.role == RbacRole.reseller) {
            return await this.numberRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        }
        return await this.numberRepo.readAll(sr)
    }

}