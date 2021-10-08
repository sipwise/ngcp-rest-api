import {Controller, Get, Patch, Put} from '@nestjs/common'
import {JournalsService} from '../journals/journals.service'
import {CrudController} from '../../controllers/crud.controller'
import {VoicemailsettingCreateDto} from './dto/voicemailsetting-create.dto'
import {VoicemailsettingResponseDto} from './dto/voicemailsetting-response.dto'
import {VoicemailsettingsService} from './voicemailsettings.service'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {ApiBody, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'

const resourceName = 'voicemailsettings'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Voicemail settings')
export class VoicemailsettingsController extends CrudController<VoicemailsettingCreateDto, VoicemailsettingResponseDto> {

    constructor(
        private readonly voicemailsettingService: VoicemailsettingsService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, voicemailsettingService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [VoicemailsettingResponseDto],
    })
    async readAll(page, rows, req): Promise<VoicemailsettingResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: VoicemailsettingResponseDto,
    })
    async read(id, req): Promise<VoicemailsettingResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailsettingResponseDto,
    })
    async update(id: number, dto: VoicemailsettingCreateDto, req: Request): Promise<VoicemailsettingResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: VoicemailsettingResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<VoicemailsettingResponseDto> {
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
