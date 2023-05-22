import {StreamableFile} from '@nestjs/common'
import {Operation as PatchOperation} from '../helpers/patch.helper'
import {ServiceRequest} from './service-request.interface'
import {Dictionary} from '../helpers/dictionary.helper'

export interface CrudService<InternalEntity> {
    create?(entities: InternalEntity[], sr: ServiceRequest, file?: Express.Multer.File): Promise<InternalEntity[]>

    readAll(sr: ServiceRequest): Promise<[InternalEntity[], number]>

    read(id: number | string, sr: ServiceRequest): Promise<InternalEntity> | Promise<StreamableFile>

    update?(updates: Dictionary<InternalEntity>, sr: ServiceRequest): Promise<number[]>

    adjust?(updates: Dictionary<PatchOperation[]>, sr: ServiceRequest): Promise<number[]>

    delete?(ids: number[] | string[], sr: ServiceRequest): Promise<number[] | string[]>
}

