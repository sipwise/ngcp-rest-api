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
import {Operation as PatchOperation, validate} from 'fast-json-patch'
import {JournalsService} from '../api/journals/journals.service'
import {CrudService} from '../interfaces/crud-service.interface'
import {AppService} from '../app.service'
import {Request} from 'express'
import {Auth} from '../decorators/auth.decorator'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {LoggingInterceptor} from '../interceptors/logging.interceptor'
import {JournalingInterceptor} from '../interceptors/journaling.interceptor'

// TODO: should default permissions be RBAC_ROLES.admin, RBAC_ROLES.system?
@Auth()
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo: CrudService<CreateDTO, ResponseDTO>,
        private readonly journals?: JournalsService) {
    }

    async create(@Body() entity: CreateDTO, @Req() req: Request) {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return await this.repo.create(entity, sr)
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
    ) {
        // TODO: should readAll return total count of available items?
        return await this.repo.readAll(page, rows)
    }

    async read(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return await this.repo.read(id)
    }

    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateDTO,
        @Req() req: Request,
    ) {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return await this.repo.update(id, dto, sr)
    }

    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body() patch: PatchOperation[],
        @Req() req: Request,
    ) {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.repo.adjust(id, patch, sr)
    }

    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user,
        }
        return await this.repo.delete(id, sr)
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
}
