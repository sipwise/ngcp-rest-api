import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {ResellerbrandinglogoCreateDto} from './dto/resellerbrandinglogo-create.dto'
import {ResellerbrandinglogoResponseDto} from './dto/resellerbrandinglogo-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from 'fast-json-patch'

@Injectable()
export class ResellerbrandinglogosService implements CrudService<ResellerbrandinglogoCreateDto, ResellerbrandinglogoResponseDto> {
    async adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<ResellerbrandinglogoResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: ResellerbrandinglogoCreateDto, req?: ServiceRequest): Promise<ResellerbrandinglogoResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<ResellerbrandinglogoResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<ResellerbrandinglogoResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): ResellerbrandinglogoResponseDto {
        return undefined
    }

    async update(id: number, dto: ResellerbrandinglogoCreateDto, req?: ServiceRequest): Promise<ResellerbrandinglogoResponseDto> {
        return Promise.resolve(undefined)
    }
}
