import {Model} from "sequelize-typescript";
import {JournalsService} from "../api/journals/journals.service";
import {Body, Delete, Get, Param, Post, Put, Query} from "@nestjs/common";
import {config} from "../config/main.config";
import {CrudRepository} from "../interfaces/crud.interface";

export class CrudController<M extends Model> {

    constructor(
        private readonly resourceName: string,
        private readonly repository: CrudRepository<M>,
        private readonly journals?: JournalsService) {
    }

    @Post()
    async create(@Body() entity: M) {
        return await this.repository.create(entity)
    }

    @Get()
    async readAll(
        @Query('page') page: string,
        @Query('rows') row: string
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.repository.readAll(page, row)
    }

    @Get(':id')
    async read(
        @Query('page') page: string,
        @Query('rows') row: string,
        @Param('id') id: string,
    ) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.repository.read(page, row, +id)
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() entity: M) {
        return await this.repository.update(+id, entity)
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return await this.repository.delete(+id)
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
