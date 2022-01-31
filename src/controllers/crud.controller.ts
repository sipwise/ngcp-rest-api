import {
    BadRequestException,
    Body,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Query,
    Req,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import {Operation as PatchOperation, validate} from '../helpers/patch.helper'
import {JournalsService} from '../api/journals/journals.service'
import {CrudService} from '../interfaces/crud-service.interface'
import {AppService} from '../app.service'
import {Request} from 'express'
import {Auth} from '../decorators/auth.decorator'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {JournalingInterceptor} from '../interceptors/journaling.interceptor'

@Auth()
@UseInterceptors(new JournalingInterceptor(new JournalsService()))
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo: CrudService<CreateDTO, ResponseDTO>,
        private readonly journals?: JournalsService) {
    }

    async create(@Body() entity: CreateDTO, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
        return await this.repo.create(entity, this.newServiceRequest(req), file)
    }

    async readAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe,
        ) rows: number,
        @Req() req: Request,
    ) {
        // TODO: should readAll return total count of available items?
        return await this.repo.readAll(page, rows, this.newServiceRequest(req))
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
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.repo.adjust(id, patch, this.newServiceRequest(req))
    }

    async delete(@Param('id') id: number | string, @Req() req: Request): Promise<number | string> {
        return await this.repo.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    async journal(
        @Param('id') id: number | string,
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) row: number,
        @Req() req: Request,
    ) {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return this.journals.readAll(sr, page, row, this.resourceName, id)
    }

    protected newServiceRequest(req: Request): ServiceRequest {
        return {
            headers: [req.rawHeaders],
            params: [req.params],
            user: req.user,
            query: req.query,
        }
    }
}
