import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Put, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {JournalService} from '../journals/journal.service'
import {number} from 'yargs'
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {RbacRole} from '../../config/constants.config'
import {VoicemailUpdateDto} from './dto/voicemail-update.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'
import {VoicemailService} from './voicemail.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {VoicemailSearchDto} from './dto/voicemail-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'voicemails'

@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller)
@ApiTags('Voicemail')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class VoicemailController extends CrudController<VoicemailUpdateDto, VoicemailResponseDto> {
    private readonly log = new LoggerService(VoicemailController.name)

    constructor(
        private readonly voicemailService: VoicemailService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, voicemailService, journalService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(VoicemailResponseDto)
    async readAll(@Req() req): Promise<[VoicemailResponseDto[], number]> {
        this.log.debug({message: 'fetch all voicemails', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [result, totalCount] =
            await this.voicemailService.readAll(sr)
        const responseList = result.map(voicemail => new VoicemailResponseDto(voicemail))
        if (sr.query.expand) {
            const voicemailSearchDtoKeys = Object.keys(new VoicemailSearchDto())
            await this.expander.expandObjects(responseList, voicemailSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<VoicemailResponseDto> {
        this.log.debug({message: 'fetch voicemail by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const voicemail = await this.voicemailService.read(id, sr)
        const responseItem = new VoicemailResponseDto(voicemail)
        if (req.query.expand && !req.isRedirected) {
            const voicemailSearchDtoKeys = Object.keys(new VoicemailSearchDto())
            await this.expander.expandObjects(responseItem, voicemailSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<number> {
        this.log.debug({message: 'delete voicemail by id', func: this.delete.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.voicemailService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, @Body() patch: PatchOperation | PatchOperation[], @Req() req): Promise<VoicemailResponseDto> {
        this.log.debug({message: 'patch voicemail by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const err = validate(patch)
        if (err) {
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        const voicemail = await this.voicemailService.adjust(id, patch, sr)
        const response = new VoicemailResponseDto(voicemail)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() update: VoicemailUpdateDto, @Req() req): Promise<VoicemailResponseDto> {
        this.log.debug({message: 'update voicemail by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const voicemail = await this.voicemailService.update(id, update.toInternal(), sr)
        const response = new VoicemailResponseDto(voicemail)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({
            message: 'fetch voicemail journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
