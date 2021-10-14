import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {VoicemailCreateDto} from './dto/voicemail-create.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from '../../helpers/patch.helper'

@Injectable()
export class VoicemailsService implements CrudService<VoicemailCreateDto, VoicemailResponseDto> {
    async adjust(id: number, patch: Operation | Operation[], req?: ServiceRequest): Promise<VoicemailResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: VoicemailCreateDto, req?: ServiceRequest): Promise<VoicemailResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<VoicemailResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<VoicemailResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): VoicemailResponseDto {
        return undefined
    }

    async update(id: number, dto: VoicemailCreateDto, req?: ServiceRequest): Promise<VoicemailResponseDto> {
        return Promise.resolve(undefined)
    }
}
