import {Injectable} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {VoicemailsettingCreateDto} from './dto/voicemailsetting-create.dto'
import {VoicemailsettingResponseDto} from './dto/voicemailsetting-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from '../../helpers/patch.helper'

@Injectable()
export class VoicemailsettingsService implements CrudService<VoicemailsettingCreateDto, VoicemailsettingResponseDto> {
    async adjust(id: number, patch: Operation | Operation[], req?: ServiceRequest): Promise<VoicemailsettingResponseDto> {
        return Promise.resolve(undefined)
    }

    async create(dto: VoicemailsettingCreateDto, req?: ServiceRequest): Promise<VoicemailsettingResponseDto> {
        return Promise.resolve(undefined)
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    async read(id: number): Promise<VoicemailsettingResponseDto> {
        return Promise.resolve(undefined)
    }

    async readAll(page: number, rows: number): Promise<VoicemailsettingResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): VoicemailsettingResponseDto {
        return undefined
    }

    async update(id: number, dto: VoicemailsettingCreateDto, req?: ServiceRequest): Promise<VoicemailsettingResponseDto> {
        return Promise.resolve(undefined)
    }
}
