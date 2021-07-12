import {JournalsService} from "../api/journals/journals.service";
import {Body, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors} from '@nestjs/common'
import {config} from "../config/main.config";
import {CrudService} from '../interfaces/crud-service.interface'
import {ApiCreatedResponse} from '@nestjs/swagger'
import {OmniGuard} from '../guards/omni.guard'
import {LoggingInterceptor} from '../interceptors/logging.interceptor'
import {JournalingInterceptor} from '../interceptors/journaling.interceptor'

@UseGuards(OmniGuard)
@UseInterceptors(LoggingInterceptor, JournalingInterceptor)
export class CrudController<CreateDTO, ResponseDTO> {

    constructor(
        private readonly resourceName: string,
        private readonly repo: CrudService<any, any>,
        private readonly journals?: JournalsService) {
    }

    @Post()
    @ApiCreatedResponse({
        // type: option => {
        // }
        // TODO: How to set responses? Cannot use ResponseDTO type
    })
    async create(@Body() entity: CreateDTO) {
        return await this.repo.create(entity)
    }

    @Get()
    async readAll(
        @Query('page') page: string,
        @Query('rows') row: string
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.repo.readAll(page, row)
    }

    @Get(':id')
    async read(
        @Param('id') id: string,
    ) {
        return await this.repo.read(+id)
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() entity: CreateDTO) {
        return await this.repo.update(+id, entity)
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return await this.repo.delete(+id)
    }

    @Get(':id/journal')
    async journal(
        @Param('id') id: string,
        @Query('page') page: string,
        @Query('rows') row: string,
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return this.journals.readAll(page, row, this.resourceName, id)
    }
}
