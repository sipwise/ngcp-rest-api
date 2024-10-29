import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {VoicemailRequestDto} from './dto/voicemail-request.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'
import {VoicemailSearchDto} from './dto/voicemail-search.dto'
import {VoicemailService} from './voicemail.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation, Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'


const resourceName = 'voicemails'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
)
@ApiTags('Voicemail')
@Controller(resourceName)
export class VoicemailController extends CrudController<VoicemailRequestDto, VoicemailResponseDto> {
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
            await this.expander.expandObjects([responseItem], voicemailSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: number,
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({message: 'delete voicemail by id', func: this.delete.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const deletedIds = await this.voicemailService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<VoicemailResponseDto> {
        this.log.debug({message: 'patch voicemail by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.voicemailService.read(id, sr)
        const entity = await patchToEntity<internal.Voicemail, VoicemailRequestDto>(oldEntity, patch, VoicemailRequestDto)
        const update = new Dictionary<internal.Voicemail>(id.toString(), entity)

        const ids = await this.voicemailService.update(update, sr)
        const updatedEntity = await this.voicemailService.read(ids[0], sr)
        const response = new VoicemailResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.Voicemail>()
        for (const id of Object.keys(patches)) {
            const patch = patches[id]
            const oldEntity = await this.voicemailService.read(+id, sr)
            const entity = await patchToEntity<internal.Voicemail, VoicemailRequestDto>(oldEntity, patch, VoicemailRequestDto)
            updates[id] = entity
        }

        return await this.voicemailService.update(updates, sr)
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() update: VoicemailRequestDto, @Req() req): Promise<VoicemailResponseDto> {
        this.log.debug({
            message: 'update voicemail by id',
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Voicemail>()
        updates[id] = update.toInternal({id: id, assignNulls: true})
        const ids = await this.voicemailService.update(updates, sr)
        const voicemail = await this.voicemailService.read(ids[0], sr)
        const response = new VoicemailResponseDto(voicemail)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(VoicemailRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: VoicemailRequestDto})) updates: Dictionary<VoicemailRequestDto>,
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({
            message: 'update voicemails bulk',
            func: this.updateMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const voicemails = new Dictionary<internal.Voicemail>()
        for (const id of Object.keys(updates)) {
            const dto: VoicemailRequestDto = updates[id]
            voicemails[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.voicemailService.update(voicemails, sr)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch voicemail journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
