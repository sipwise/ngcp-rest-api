import {BadRequestException, Body, Get, Param, Req, UploadedFile} from '@nestjs/common'
import {Operation as PatchOperation, validate} from '../helpers/patch.helper'
import {JournalsService} from '../api/journals/journals.service'
import {Request} from 'express'
import {Auth} from '../decorators/auth.decorator'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {JournalResponseDto} from '../api/journals/dto/journal-response.dto'

@Auth()
// @UseInterceptors(new JournalingInterceptor(new JournalsService()))
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo: any, //CrudService<CreateDTO, ResponseDTO>,
        private readonly journals?: JournalsService) {
    }

    async create(@Body() entity: CreateDTO, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
        return await this.repo.create(entity, this.newServiceRequest(req), file)
    }

    async readAll(
        @Req() req: Request,
    ) {
        return await this.repo.readAll(this.newServiceRequest(req))
    }

    async read(
        @Param('id') id: number | string,
        @Req() req: Request,
    ) {
        return await this.repo.read(id, this.newServiceRequest(req))
    }

    async update(
        @Param('id') id: number | string,
        @Body() dto: CreateDTO,
        @Req() req: Request,
    ) {
        return await this.repo.update(id, dto, this.newServiceRequest(req))
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
        return await this.repo.adjust(id, patch, this.newServiceRequest(req))
    }

    async delete(@Param('id') id: number | string, @Req() req: Request): Promise<number | string> {
        return await this.repo.delete(id, this.newServiceRequest(req))
    }

    // TODO: classes which extend CrudController that have no journal capabilitiy still have swagger documentation
    @Get(':id/journal')
    async journal(
        @Param('id') id: number | string,
        @Req() req,
    ) {
        const sr = this.newServiceRequest(req)
        const [result, count] = await this.journals.readAll(sr, this.resourceName, id)
        return [result.map(j => new JournalResponseDto(j)), count]
    }

    protected newServiceRequest(req: Request): ServiceRequest {
        return {
            headers: [req.rawHeaders],
            params: [req.params],
            user: req.user,
            query: req.query,
            init: req,
        }
    }
}
