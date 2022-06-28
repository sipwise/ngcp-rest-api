import {internal} from '../../entities'
import {Injectable, Logger} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ProductsMariadbRepository} from './repositories/products.mariadb.repository'

@Injectable()
export class ProductsService {
    private readonly log: Logger = new Logger(ProductsService.name)
    constructor(
        private readonly productsRepo: ProductsMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Product[], number]> {
        this.log.debug({message: 'read all products', func: this.readAll.name, user: sr.user.username})
        return await this.productsRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({message: 'read product by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.productsRepo.read(id, sr)
    }
}
