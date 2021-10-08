import {Operation as PatchOperation} from 'fast-json-patch'
import {ServiceRequest} from './service-request.interface'

export interface CrudService<CreateDto, ResponseDto> {
    create(dto: CreateDto, req?: ServiceRequest): Promise<ResponseDto>

    readAll(page: number, rows: number, req?: ServiceRequest): Promise<ResponseDto[]>

    read(id: number, req?: ServiceRequest): Promise<ResponseDto>

    update(id: number, dto: CreateDto, req?: ServiceRequest): Promise<ResponseDto>

    adjust(id: number, patch: PatchOperation[], req?: ServiceRequest): Promise<ResponseDto>

    delete(id: number, req?: ServiceRequest): Promise<number>

    toResponse(entity: any): ResponseDto
}

