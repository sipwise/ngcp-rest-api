import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {SubscriberpreferenceCreateDto} from './dto/subscriberpreference-create.dto'
import {SubscriberpreferenceResponseDto} from './dto/subscriberpreference-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from 'fast-json-patch'

@Injectable()
export class SubscriberpreferencesService implements CrudService<SubscriberpreferenceCreateDto, SubscriberpreferenceResponseDto> {
    async adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<SubscriberpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: SubscriberpreferenceCreateDto, req?: ServiceRequest): Promise<SubscriberpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<SubscriberpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<SubscriberpreferenceResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): SubscriberpreferenceResponseDto {
        return undefined
    }

    async update(id: number, dto: SubscriberpreferenceCreateDto, req?: ServiceRequest): Promise<SubscriberpreferenceResponseDto> {
        return Promise.resolve(undefined)
    }
}
