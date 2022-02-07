import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {AppService} from '../../app.service'
import {Body, BadRequestException, Controller, DefaultValuePipe, Delete, Get, Patch, ParseIntPipe, Param, Post, Put, Query, Req, UseInterceptors} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {JournalsService} from '../journals/journals.service'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {number} from 'yargs'
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {RBAC_ROLES} from '../../config/constants.config'
import {VoicemailsBaseDto} from './dto/voicemails-base.dto'
import {VoicemailsResponseDto} from './dto/voicemails-response.dto'
import {VoicemailsService} from './voicemails.service'

const resourceName = 'voicemails'

@ApiTags('Voicemails')
@Controller('voicemails')
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.lintercept)
export class VoicemailsController extends CrudController<VoicemailsBaseDto, VoicemailsResponseDto> {
    constructor(
        private readonly voicemailService: VoicemailsService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, voicemailService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: VoicemailsResponseDto,
    })
    async create(@Body() voicemail: VoicemailsBaseDto, @Req() req): Promise<VoicemailsResponseDto> {
        return await this.voicemailService.create(voicemail, req)
    }

    @Get()
    @ApiOkResponse({
        type: [VoicemailsResponseDto],
    })
    async findAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page)
            , ParseIntPipe) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) row: number,
        @Req() req,
    ): Promise<VoicemailsResponseDto[]> {
        return await this.voicemailService.readAll(page, row, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: VoicemailsResponseDto,
    })
    async findOne(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<VoicemailsResponseDto> {
        return await this.voicemailService.read(id, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<number> {
        return await this.voicemailService.delete(id, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: VoicemailsResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, @Body() patch: PatchOperation | PatchOperation[], @Req() req): Promise<VoicemailsResponseDto> {
        const err = validate(patch)
        if (err) {
            let message = err.message.replace(/[\n\s]+/g, ' ').replace(/\"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.voicemailService.adjust(id, patch, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailsResponseDto
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() voicemail: VoicemailsBaseDto, @Req() req): Promise<VoicemailsResponseDto> {
        return await this.voicemailService.update(id, voicemail, req)
    }
}
