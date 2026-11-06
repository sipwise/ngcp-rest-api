// TODO: Fix this later in the generic controller approach
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {BadRequestException, Body, NotFoundException, Param, Query, Req, Res, UploadedFile} from '@nestjs/common'
import {Request} from 'express'
import {EntityNotFoundError} from 'typeorm'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Operation as PatchOperation, validate} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
export class CrudController<CreateDTO, _ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo?: any, //CrudService<CreateDTO, ResponseDTO>,
        private readonly journalCrudService?: JournalService) {
    }

    async create(@Body() entity: CreateDTO[], @Req() req: Request, @UploadedFile() file?: Express.Multer.File, @Param() _params?: unknown): Promise<any> {
        return await this.repo.create(entity, new ServiceRequest(req), file)
    }

    async readAll(
        @Req() req: Request,
        @Param() _params?: unknown,
        @Query() _query?: unknown,
        @Res({passthrough: true}) res?,
    ): Promise<any> {
        return await this.repo.readAll(new ServiceRequest(req))
    }

    async read(
        @Param('id') id: number | string,
        @Req() req: Request,
        @Param() _params?: unknown,
        @Query() _query?: unknown,
    ): Promise<any> {
        return await this.repo.read(id, new ServiceRequest(req))
    }

    async update(
        @Param('id') id: number | string,
        @Body() dto: CreateDTO,
        @Req() req: Request,
        @Param() _params?: unknown,
    ): Promise<any> {
        return await this.repo.update(id, dto, new ServiceRequest(req))
    }

    async adjust(
        @Param('id') id: number | string,
        @Body() patch: PatchOperation[],
        @Req() req: Request,
        @Param() _params?: unknown,
    ): Promise<any> {
        const err = validate(patch)
        if (err) {
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.repo.adjust(id, patch, new ServiceRequest(req))
    }

    async delete(
        @ParamOrBody('id') id: number[] | string[],
        @Req() req: Request,
        @Param() _params?: unknown,
    ): Promise<number[] | string[]> {
        return await this.repo.delete(id, new ServiceRequest(req))
    }

    async journal(
        @Param('id') id: number | string,
        @Req() req: Request,
        @Param() _params?: unknown,
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
        const [result, count] = await this.journalCrudService.readAll(sr, this.resourceName, resourceId, resourceVerified)
        return [result.map(j => new JournalResponseDto(j)), count]
    }
}