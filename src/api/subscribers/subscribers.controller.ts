import {Controller, Delete, Get, Patch, Post, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {SubscriberCreateDto} from './dto/subscriber-create.dto'
import {SubscriberResponseDto} from './dto/subscriber-response.dto'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {JournalsService} from '../journals/journals.service'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {SubscribersService} from './subscribers.service'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'

const resourceName = 'subscribers'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Subscribers')
export class SubscribersController extends CrudController<SubscriberCreateDto, SubscriberResponseDto> {

    constructor(
        private readonly subscriberService: SubscribersService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, subscriberService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: SubscriberResponseDto,
    })
    async create(entity: SubscriberCreateDto, req: Request): Promise<SubscriberResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [SubscriberResponseDto],
    })
    async readAll(page: number, rows: number): Promise<SubscriberResponseDto[]> {
        return super.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    async read(id: number): Promise<SubscriberResponseDto> {
        return super.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    async update(id: number, dto: SubscriberCreateDto, req: Request): Promise<SubscriberResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<SubscriberResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(id: number): Promise<number> {
        return super.delete(id)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}