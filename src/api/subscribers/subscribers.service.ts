import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {SubscriberCreateDto} from './dto/subscriber-create.dto'
import {SubscriberResponseDto} from './dto/subscriber-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from '../../helpers/patch.helper'

@Injectable()
export class SubscribersService implements CrudService<SubscriberCreateDto, SubscriberResponseDto> {
    async adjust(id: number, patch: Operation | Operation[], req?: ServiceRequest): Promise<SubscriberResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: SubscriberCreateDto, req?: ServiceRequest): Promise<SubscriberResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<SubscriberResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<SubscriberResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): SubscriberResponseDto {
        return undefined
    }

    async update(id: number, dto: SubscriberCreateDto, req?: ServiceRequest): Promise<SubscriberResponseDto> {
        return Promise.resolve(undefined)
    }
}
