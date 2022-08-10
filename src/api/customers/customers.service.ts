import {Injectable, MethodNotAllowedException} from '@nestjs/common'
import {CustomerCreateDto} from './dto/customer-create.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {Operation} from '../../helpers/patch.helper'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {CustomerBaseDto} from './dto/customer-base.dto'
import {AppService} from '../../app.service'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'

@Injectable()
export class CustomersService { // implements CrudService<CustomerCreateDto, CustomerResponseDto> {

    constructor(
        private readonly app: AppService,
    ) {
    }

    async create(dto: CustomerCreateDto, req: ServiceRequest): Promise<CustomerResponseDto> {
        const now = new Date(Date.now())
        const c = db.billing.Contract.create()
        // TODO: Transaction guard
        // return this.toResponse(await c.save())
        return
    }

    async delete(id: number, req: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
        return Promise.resolve(0)
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<CustomerResponseDto> {
        //    return this.toResponse(await db.billing.Contract.findOneOrFail(id))
        return
    }

    @HandleDbErrors
    async readAll(req: ServiceRequest): Promise<[CustomerResponseDto[], number]> {
        // const result = await db.billing.Contract.find({
        //     take: rows, skip: rows * (page - 1),
        // })
        //return result.map((c => this.toResponse(c)))
        return
    }

    toResponse(c: db.billing.Customer): CustomerResponseDto {
        return
        // return {
        //     business: c.business,
        //     comm_contact_id: c.comm_contact_id,
        //     contact_id: c.contact_id,
        //     create_timestamp: c.create_timestamp,
        //     external_id: c.external_id,
        //     id: c.id,
        //     modify_timestamp: c.modify_timestamp,
        //     reseller_id: c.reseller_id,
        //     shoppass: c.shoppass,
        //     shopuser: c.shopuser,
        //     tech_contact_id: c.tech_contact_id,
        // }
    }

    async update(id: number, dto: CustomerCreateDto, req: ServiceRequest): Promise<CustomerResponseDto> {
        return Promise.resolve(undefined)
    }

    async adjust(id: number, patch: Operation | Operation[], req: ServiceRequest): Promise<CustomerResponseDto> {
        return Promise.resolve(undefined)
    }

    private async save(oldId: number, reseller: CustomerBaseDto): Promise<db.billing.Customer> {
        let entry = await db.billing.Contract.findOne(oldId)

        entry = db.billing.Contract.merge(entry, this.inflate(reseller))
        await entry.save()
        return
    }

    private inflate(dto: CustomerBaseDto): db.billing.Customer {
        return Object.assign(dto)
    }

    private deflate(entry: db.billing.Customer): CustomerBaseDto {
        return Object.assign(entry)
    }
}
