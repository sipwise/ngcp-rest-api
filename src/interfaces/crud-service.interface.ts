import {StreamableFile} from '@nestjs/common'
import {Operation as PatchOperation} from '../helpers/patch.helper'
import {ServiceRequest} from './service-request.interface'

export interface CrudService<CreateDto, ResponseDto> {
    create(dto: CreateDto, req: ServiceRequest, file?: Express.Multer.File): Promise<ResponseDto>

    readAll(page: number, rows: number, req: ServiceRequest): Promise<[ResponseDto[], number]>

    read(id: number | string, req: ServiceRequest): Promise<ResponseDto> | Promise<StreamableFile>

    update(id: number | string, dto: CreateDto, req: ServiceRequest): Promise<ResponseDto>

    adjust(id: number | string, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<ResponseDto>

    delete(id: number | string, req: ServiceRequest): Promise<number | string>

    toResponse(entity: any, req: ServiceRequest): ResponseDto
}

