// TODO: Fix this later in the generic controller approach
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {BadRequestException} from '@nestjs/common'
import {Request} from 'express'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {Auth} from '~/decorators/auth.decorator'
import {Operation as PatchOperation, validate} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
export class CrudController<CreateDTO, _ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo?: any, //CrudService<CreateDTO, ResponseDTO>,
        private readonly journalCrudService?: JournalService) {
    }

    async create(entity: CreateDTO | CreateDTO[], req: Request, file?: Express.Multer.File, ..._params: unknown[]): Promise<any> {
        return await this.repo.create(entity, new ServiceRequest(req), file)
    }

    async readAll(
        req: Request,
        _query?: unknown,
        _res?: unknown,
        ..._params: unknown[]
    ): Promise<any> {
        return await this.repo.readAll(new ServiceRequest(req))
    }

    async read(
        id: number | string,
        req: Request,
        _query?: unknown,
        ..._params: unknown[]
    ): Promise<any> {
        return await this.repo.read(id, new ServiceRequest(req))
    }

    async update(
        id: number | string,
        dto: CreateDTO,
        req: Request,
        ..._params: unknown[]
    ): Promise<any> {
        return await this.repo.update(id, dto, new ServiceRequest(req))
    }

    async adjust(
        id: number | string,
        patch: PatchOperation[],
        req: Request,
        ..._params: unknown[]
    ): Promise<any> {
        const err = validate(patch)
        if (err) {
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.repo.adjust(id, patch, new ServiceRequest(req))
    }

    async delete(
        id: number[] | string[],
        req: Request,
        ..._params: unknown[]
    ): Promise<number[] | string[]> {
        return await this.repo.delete(id, new ServiceRequest(req))
    }

    async journal(
        id: number | string,
        req: Request,
        ..._params: unknown[]
    ): Promise<[JournalResponseDto[], number]>{
        const sr = new ServiceRequest(req)
        const [result, count] = await this.journalCrudService.readAll(sr, this.resourceName, id)
        return [result.map(j => new JournalResponseDto(j)), count]
    }
}