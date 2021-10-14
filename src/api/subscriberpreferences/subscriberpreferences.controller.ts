import {Controller, Get, Patch, Put} from '@nestjs/common'
import {JournalsService} from '../journals/journals.service'
import {CrudController} from '../../controllers/crud.controller'
import {SubscriberpreferenceCreateDto} from './dto/subscriberpreference-create.dto'
import {SubscriberpreferenceResponseDto} from './dto/subscriberpreference-response.dto'
import {SubscriberpreferencesService} from './subscriberpreferences.service'
import {ApiBody, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {PatchDto} from '../patch.dto'

const resourceName = 'subscriberpreferences'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Subscriber preferences')
export class SubscriberpreferencesController extends CrudController<SubscriberpreferenceCreateDto, SubscriberpreferenceResponseDto> {
    constructor(
        private readonly preferenceService: SubscriberpreferencesService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, preferenceService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [SubscriberpreferenceResponseDto],
    })
    async readAll(page, rows, req): Promise<SubscriberpreferenceResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: SubscriberpreferenceResponseDto,
    })
    async read(id, req): Promise<SubscriberpreferenceResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: SubscriberpreferenceResponseDto,
    })
    async update(id: number, dto: SubscriberpreferenceCreateDto, req: Request): Promise<SubscriberpreferenceResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: SubscriberpreferenceResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation | Operation[], req: Request): Promise<SubscriberpreferenceResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
