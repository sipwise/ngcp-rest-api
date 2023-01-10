import {BadRequestException, Body, Param, Req, UploadedFile} from '@nestjs/common'
import {Operation as PatchOperation, validate} from '../helpers/patch.helper'
import {JournalService} from '../api/journals/journal.service'
import {Request} from 'express'
import {Auth} from '../decorators/auth.decorator'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {JournalResponseDto} from '../api/journals/dto/journal-response.dto'

@Auth()
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo?: any, //CrudService<CreateDTO, ResponseDTO>,
        private readonly journalCrudService?: JournalService) {
    }

    async create(@Body() entity: CreateDTO, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
        return await this.repo.create(entity, new ServiceRequest(req), file)
    }

    async readAll(
        @Req() req: Request,
    ) {
        return await this.repo.readAll(new ServiceRequest(req))
    }

    async read(
        @Param('id') id: number | string,
        @Req() req: Request,
    ) {
        return await this.repo.read(id, new ServiceRequest(req))
    }

    async update(
        @Param('id') id: number | string,
        @Body() dto: CreateDTO,
        @Req() req: Request,
    ) {
        return await this.repo.update(id, dto, new ServiceRequest(req))
    }

    async adjust(
        @Param('id') id: number | string,
        @Body() patch: PatchOperation | PatchOperation[],
        @Req() req: Request,
    ) {
        const err = validate(patch)
        if (err) {
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.repo.adjust(id, patch, new ServiceRequest(req))
    }

    async delete(@Param('id') id: number | string, @Req() req: Request): Promise<number | string> {
        return await this.repo.delete(id, new ServiceRequest(req))
    }

    async journal(
        @Param('id') id: number | string,
        @Req() req,
    ) {
        const sr = new ServiceRequest(req)
        const [result, count] = await this.journalCrudService.readAll(sr, this.resourceName, id)
        return [result.map(j => new JournalResponseDto(j)), count]
    }
}
