import {StreamableFile} from '@nestjs/common'
import {Operation as PatchOperation} from '../helpers/patch.helper'
import {ServiceRequest} from './service-request.interface'

export interface CrudService<InternalEntity> {
    create?(dto: InternalEntity, sr: ServiceRequest, file?: Express.Multer.File): Promise<InternalEntity>

    readAll(sr: ServiceRequest): Promise<[InternalEntity[], number]>

    read(id: number | string, sr: ServiceRequest): Promise<InternalEntity> | Promise<StreamableFile>

    update(id: number | string, dto: InternalEntity, sr: ServiceRequest): Promise<InternalEntity>

    adjust(id: number | string, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<InternalEntity>

    delete(id: number | string, sr: ServiceRequest): Promise<number | string>
}

