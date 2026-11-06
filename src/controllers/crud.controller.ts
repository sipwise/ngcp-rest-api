// TODO: Fix this later in the generic controller approach
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {NotFoundException} from '@nestjs/common'
import {Request} from 'express'
import {EntityNotFoundError} from 'typeorm'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {Auth} from '~/decorators/auth.decorator'
import {Operation as PatchOperation, assertJsonPatch} from '~/helpers/patch.helper'
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
        assertJsonPatch(patch)
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
        this.journalCrudService.checkAccess(sr)
        const resourceId = typeof id == 'string' && /^\d+$/.test(id) ? +id : id
        // the journal of a resource readable within the caller's scope is not limited further; a deleted resource
        // (or one out of scope) gets the scope of /journals/<name>/<id>
        let resourceVerified = true
        try {
            await this.repo.read(resourceId, sr)
        } catch (err) {
            if (!(err instanceof NotFoundException || err instanceof EntityNotFoundError))
                throw err
            resourceVerified = false
        }
        const [result, count] = await this.journalCrudService.readAll(sr, this.journalCrudService.resourceName(sr), resourceId, resourceVerified)
        return [result.map(j => new JournalResponseDto(j)), count]
    }
}