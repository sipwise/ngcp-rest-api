import {CrudService} from '../../interfaces/crud-service.interface'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Inject, Injectable} from '@nestjs/common'
import {LoggerService} from '../../logger/logger.service'
import {CustomernumbersMariadbRepository} from './repositories/customernumbers.mariadb.repository'
import {RbacRole} from '../../config/constants.config'

@Injectable()
export class CustomernumbersService implements CrudService<internal.CustomerNumber> {

    private readonly log = new LoggerService(CustomernumbersService.name)

    constructor(
        @Inject(CustomernumbersMariadbRepository) private readonly customerNumbersRepo: CustomernumbersMariadbRepository,
    ) {
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.CustomerNumber> {
        this.log.debug({
            message: 'read customer number by id',
            id: id,
            func: this.readAll.name,
            user: sr.user.username,
        })
        if (sr.user.role == RbacRole.subscriberadmin) {
            return await this.customerNumbersRepo.readById(id, sr, {customerId: sr.user.customer_id})
        }
        if (sr.user.role == RbacRole.ccare || sr.user.role == RbacRole.reseller) {
            return await this.customerNumbersRepo.readById(id, sr, {resellerId: sr.user.reseller_id})
        }
        return await this.customerNumbersRepo.readById(id, sr )
    }

    async readAll(sr: ServiceRequest): Promise<[internal.CustomerNumber[], number]> {
        this.log.debug({
            message: 'read all customer numbers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        if (sr.user.role == RbacRole.subscriberadmin) {
            return await this.customerNumbersRepo.readAll(sr, {customerId: sr.user.customer_id})
        }
        if (sr.user.role == RbacRole.ccare || sr.user.role == RbacRole.reseller) {
            return await this.customerNumbersRepo.readAll(sr, {resellerId: sr.user.reseller_id})
        }
        return await this.customerNumbersRepo.readAll(sr)
    }

}