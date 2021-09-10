import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {CallforwardCreateDto} from './dto/callforward-create.dto'
import {CallforwardResponseDto} from './dto/callforward-response.dto'
import {Operation} from 'fast-json-patch'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'

@Injectable()
export class CallforwardsService implements CrudService<CallforwardCreateDto, CallforwardResponseDto> {
    @HandleDbErrors
    async adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<CallforwardResponseDto> {
        return Promise.resolve(undefined)
    }

    @HandleDbErrors
    async create(dto: CallforwardCreateDto, req?: ServiceRequest): Promise<CallforwardResponseDto> {
        return Promise.resolve(undefined)
    }

    @HandleDbErrors
    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    @HandleDbErrors
    async read(id: number): Promise<CallforwardResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<CallforwardResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): CallforwardResponseDto {
        return undefined
    }

    @HandleDbErrors
    async update(id: number, dto: CallforwardCreateDto, req?: ServiceRequest): Promise<CallforwardResponseDto> {
        return Promise.resolve(undefined)
    }
}
