import {internal} from '~/entities'
import {Inject, Injectable} from '@nestjs/common'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {ProductMariadbRepository} from '~/api/products/repositories/product.mariadb.repository'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class ProductService {
    private readonly log = new LoggerService(ProductService.name)
    constructor(
        @Inject(ProductMariadbRepository) private readonly productRepo: ProductMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Product[], number]> {
        this.log.debug({message: 'read all products', func: this.readAll.name, user: sr.user.username})
        return await this.productRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({message: 'read product by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.productRepo.read(id, sr)
    }
}
