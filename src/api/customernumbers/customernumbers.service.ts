import {CrudService} from '../../interfaces/crud-service.interface'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Inject, Injectable} from '@nestjs/common'
import {LoggerService} from '../../logger/logger.service'
import {CustomernumbersMariadbRepository} from './repositories/customernumbers.mariadb.repository'

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
        return await this.customerNumbersRepo.readById(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.CustomerNumber[], number]> {
        this.log.debug({
            message: 'read all customer numbers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.customerNumbersRepo.readAll(sr)
    }

}