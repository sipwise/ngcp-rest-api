import {Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {ResellerRequestDto} from './dto/reseller-request.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {ResellerSearchDto} from './dto/reseller-search.dto'
import {ResellerService} from './reseller.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation,Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'resellers'

@Auth(
    RbacRole.admin,
    RbacRole.system,
)
@ApiTags('Reseller')
@Controller(resourceName)
@License(LicenseType.reseller)
export class ResellerController extends CrudController<ResellerRequestDto, ResellerResponseDto> {
    private readonly log = new LoggerService(ResellerController.name)

    constructor(
        private readonly resellerService: ResellerService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, resellerService, journalService)
    }


    // TODO: could we use DELETE to terminate resellers? https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.5

    @Post()
    @ApiCreatedResponse(ResellerResponseDto)
    @ApiBody({
        type: ResellerRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: ResellerRequestDto})) createDto: ResellerRequestDto[],
        @Req() req: Request,
    ): Promise<ResellerResponseDto[]> {
        this.log.debug({
            message: 'create reseller bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const resellers = createDto.map(reseller => reseller.toInternal())
        const created = await this.resellerService.create(resellers, sr)
        return created.map((reseller) => new ResellerResponseDto(reseller))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ResellerResponseDto)
    async readAll(@Req() req: Request): Promise<[ResellerResponseDto[], number]> {
        this.log.debug({message: 'fetch all resellers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [resellers, totalCount] =
            await this.resellerService.readAll(sr)
        const responseList = resellers.map(reseller => new ResellerResponseDto(reseller))
        if (sr.query.expand) {
            const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
            await this.expander.expandObjects(responseList, resellerSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<ResellerResponseDto> {
        this.log.debug({message: 'fetch reseller by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const reseller = await this.resellerService.read(id, sr)
        const responseItem = new ResellerResponseDto(reseller)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
            await this.expander.expandObjects([responseItem], resellerSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: ResellerRequestDto, req): Promise<ResellerResponseDto> {
        this.log.debug({message: 'update reseller by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Reseller>()
        updates[id] = entity.toInternal({id: id, assignNulls: true})
        const ids = await this.resellerService.update(updates, sr)
        const reseller = await this.resellerService.read(ids[0], sr)
        const response = new ResellerResponseDto(reseller)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(ResellerRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: ResellerRequestDto})) updates: Dictionary<ResellerRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update resellers bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const resellers = new Dictionary<internal.Reseller>()
        for (const id of Object.keys(updates)) {
            const dto: ResellerRequestDto = updates[id]
            resellers[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.resellerService.update(resellers, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<ResellerResponseDto> {
        this.log.debug({message: 'patch reseller by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.resellerService.read(id, sr)
        const entity = await patchToEntity<internal.Reseller, ResellerRequestDto>(oldEntity, patch, ResellerRequestDto)
        const update = new Dictionary<internal.Reseller>(id.toString(), entity)

        const ids = await this.resellerService.update(update, sr)
        const updatedEntity = await this.resellerService.read(ids[0], sr)
        const response = new ResellerResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.Reseller>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.resellerService.read(+id, sr)
            const entity = await patchToEntity<internal.Reseller, ResellerRequestDto>(oldEntity, patches[id], ResellerRequestDto)
            updates[id] = entity
        }

        return await this.resellerService.update(updates, sr)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch reseller journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
