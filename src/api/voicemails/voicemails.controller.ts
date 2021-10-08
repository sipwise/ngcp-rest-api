import {Controller, Delete, Get, Patch, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {VoicemailCreateDto} from './dto/voicemail-create.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {JournalsService} from '../journals/journals.service'
import {VoicemailsService} from './voicemails.service'
import {ApiBody, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'

const resourceName = 'voicemails'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Voicemails')
export class VoicemailsController extends CrudController<VoicemailCreateDto, VoicemailResponseDto> {

    constructor(
        private readonly voicemailService: VoicemailsService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, voicemailService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [VoicemailResponseDto],
    })
    async readAll(page, rows, req): Promise<VoicemailResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async read(id, req): Promise<VoicemailResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async update(id: number, dto: VoicemailCreateDto, req: Request): Promise<VoicemailResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<VoicemailResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(id, req): Promise<number> {
        return super.delete(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: JournalResponseDto,
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
