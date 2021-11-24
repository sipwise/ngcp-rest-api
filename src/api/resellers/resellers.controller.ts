import {Controller, Get, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
import {JournalsService} from '../journals/journals.service'
import {ResellersService} from './resellers.service'
import {CrudController} from '../../controllers/crud.controller'
import {ResellerCreateDto} from './dto/reseller-create.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Operation} from '../../helpers/patch.helper'
import {Roles} from '../../decorators/roles.decorator'
import {Request} from 'express'
import {RBAC_ROLES} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'

const resourceName = 'resellers'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system)
@ApiTags('Resellers')
@Controller(resourceName)
export class ResellersController extends CrudController<ResellerCreateDto, ResellerResponseDto> {
    constructor(
        private readonly resellersService: ResellersService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, resellersService, journalsService)
    }

    @Post()
    @Roles(RBAC_ROLES.reseller)
    @ApiCreatedResponse({
        type: ResellerResponseDto,
    })
    async create(entity: ResellerCreateDto, req: Request): Promise<ResellerResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [ResellerResponseDto],
    })
    async readAll(page, rows, req): Promise<ResellerResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ResellerResponseDto> {
        return this.resellersService.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: ResellerCreateDto, req: Request): Promise<ResellerResponseDto> {
        return super.update(id, entity, req)
    }

    // DELETE is not allowed for Resellers
    // @Delete(':id')
    // async delete(id): Promise<number> {
    //     return super.delete(id)
    // }

    @Patch(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req: Request): Promise<ResellerResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }
}
