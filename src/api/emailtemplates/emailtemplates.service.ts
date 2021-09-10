import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {EmailtemplateCreateDto} from './dto/emailtemplate-create.dto'
import {EmailtemplateResponseDto} from './dto/emailtemplate-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from 'fast-json-patch'

@Injectable()
export class EmailtemplatesService implements CrudService<EmailtemplateCreateDto, EmailtemplateResponseDto> {
    async adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<EmailtemplateResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: EmailtemplateCreateDto, req?: ServiceRequest): Promise<EmailtemplateResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<EmailtemplateResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<EmailtemplateResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): EmailtemplateResponseDto {
        return undefined
    }

    async update(id: number, dto: EmailtemplateCreateDto, req?: ServiceRequest): Promise<EmailtemplateResponseDto> {
        return Promise.resolve(undefined)
    }
}
