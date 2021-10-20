import {
    BadRequestException,
    Body,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Query,
    Req,
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

// TODO: should default permissions be RBAC_ROLES.admin, RBAC_ROLES.system?
@Auth()
@UseInterceptors(new JournalingInterceptor(new JournalsService()))
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo: CrudService<CreateDTO, ResponseDTO>,
        private readonly journals?: JournalsService) {
    }

    async create(@Body() entity: CreateDTO, @Req() req: Request) {
        return await this.repo.create(entity, this.newServiceRequest(req))
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
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
    ) {
        return await this.repo.read(id, this.newServiceRequest(req))
    }

    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateDTO,
        @Req() req: Request,
    ) {
        return await this.repo.update(id, dto, this.newServiceRequest(req))
    }

    async adjust(
        @Param('id', ParseIntPipe) id: number,
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

    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return await this.repo.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    async journal(
        @Param('id', ParseIntPipe) id: number,
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe,
        ) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) row: number,
    ) {
        return this.journals.readAll(page, row, this.resourceName, id)
    }

    private newServiceRequest(req: Request): ServiceRequest {
        return {
            headers: [req.rawHeaders],
            params: [req.params],
            user: req.user,
        }
    }
}
