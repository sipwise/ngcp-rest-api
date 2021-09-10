import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {CustomerpreferenceCreateDto} from './dto/customerpreference-create.dto'
import {CustomerpreferenceResponseDto} from './dto/customerpreference-response.dto'
import {Operation} from 'fast-json-patch'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'

@Injectable()
export class CustomerpreferencesService implements CrudService<CustomerpreferenceCreateDto, CustomerpreferenceResponseDto> {
    @HandleDbErrors
    async adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<CustomerpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    @HandleDbErrors
    async create(dto: CustomerpreferenceCreateDto, req?: ServiceRequest): Promise<CustomerpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    @HandleDbErrors
    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    @HandleDbErrors
    async read(id: number): Promise<CustomerpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<CustomerpreferenceResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): CustomerpreferenceResponseDto {
        return undefined
    }

    @HandleDbErrors
    async update(id: number, dto: CustomerpreferenceCreateDto, req?: ServiceRequest): Promise<CustomerpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }
}
