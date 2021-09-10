import {Operation as PatchOperation} from 'fast-json-patch'
import {ServiceRequest} from './service-request.interface'

export interface CrudService<CreateDto, ResponseDto> {
    create(dto: CreateDto, req?: ServiceRequest): Promise<ResponseDto>

    readAll(page: number, rows: number): Promise<ResponseDto[]>

    read(id: number): Promise<ResponseDto>

    update(id: number, dto: CreateDto, req?: ServiceRequest): Promise<ResponseDto>

    adjust(id: number, patch: PatchOperation[], req?: ServiceRequest): Promise<ResponseDto>

    delete(id: number): Promise<number>

    toResponse(entity: any): ResponseDto
}

