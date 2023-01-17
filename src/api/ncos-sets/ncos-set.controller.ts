import {Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags
} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'helpers/patch.helper'
import {RbacRole} from '../../config/constants.config'
import {CrudController} from '../../controllers/crud.controller'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {Auth} from '../../decorators/auth.decorator'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {LoggerService} from '../../logger/logger.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {PaginatedDto} from '../paginated.dto'
import {PatchDto} from '../patch.dto'
import {NCOSSetCreateDto} from './dto/ncos-set-create.dto'
import {NCOSSetLevelCreateDto} from './dto/ncos-set-level-create.dto'
import {NCOSSetLevelResponseDto} from './dto/ncos-set-level-response.dto'
import {NCOSSetResponseDto} from './dto/ncos-set-response.dto'
import {NCOSSetUpdateDto} from './dto/ncos-set-update.dto'
import {NCOSSetService} from './ncos-set.service'

const resourceName = 'ncos/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class NCOSSetController extends CrudController<NCOSSetCreateDto, NCOSSetResponseDto> {
    private readonly log = new LoggerService(NCOSSetController.name)

    constructor(
        private readonly ncosSetService: NCOSSetService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ncosSetService, journalService)
    }


    /* NCOS Set Level */


    @Post(':id/levels')
    @ApiCreatedResponse({
        type: NCOSSetLevelResponseDto,
    })
    async createLevel(
            @Param('id') id: number,
            @Body() dto: NCOSSetLevelCreateDto,
            @Req() req: Request
            ): Promise<NCOSSetLevelResponseDto> {
        this.log.debug({
            message: 'create ncos set level',
            func: this.createLevel.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const setLevel = await this.ncosSetService.createLevel(
            id,
            Object.assign(new NCOSSetLevelCreateDto(), dto).toInternal(),
            sr,
        )
        const response = new NCOSSetLevelResponseDto(setLevel)
        await this.journalService.writeJournal(sr, setLevel.id, response)
        return response
    }

    @Post(':id/levels/bulk')
    @ApiCreatedResponse({
        type: [NCOSSetLevelResponseDto],
    })
    async createLevelMany(
        @Param('id') id: number,
        @Body(new ParseArrayPipe({items: NCOSSetLevelCreateDto})) createDto: NCOSSetLevelCreateDto[],
        @Req() req: Request,
    ): Promise<NCOSSetLevelResponseDto[]> {
        this.log.debug({
            message: 'create ncos set level bulk',
            func: this.createMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const setLevels = await Promise.all(createDto.map(async setLevel => setLevel.toInternal()))
        const created = await this.ncosSetService.createLevelMany(id, setLevels, sr)
        return await Promise.all(created.map(async setLevel => new NCOSSetLevelResponseDto(setLevel)))
    }

    @Get(':id?/levels')
    @ApiOkResponse({
        type: NCOSSetLevelResponseDto,
    })
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSSetLevelResponseDto)
    async readLevelAll(
            @Param('id') id: number,
            @Req() req: Request
            ): Promise<[NCOSSetLevelResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos set level',
            func: this.readLevelAll.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosSetService.readLevelAll(sr, id)
        const responseList = entity.map(e => new NCOSSetLevelResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':id?/levels/:levelId')
    @ApiOkResponse({
        type: NCOSSetLevelResponseDto,
    })
    async readLevel(
            @Req() req: Request,
            @Param('levelId', ParseIntPipe) levelId: number,
            @Param('id') id?: number
            ): Promise<NCOSSetLevelResponseDto> {
        this.log.debug({
            message: 'read ncos set level by id',
            id: levelId,
            func: this.readLevel.name,
            url: req.url,
            method: req.method
        })
        const response = await this.ncosSetService.readLevel(id, levelId, new ServiceRequest(req))
        return new NCOSSetLevelResponseDto(response)
    }

    @Delete(':id?/levels/:levelId')
    @ApiOkResponse({})
    async deleteLevel(
            @Req() req: Request,
            @Param('levelId', ParseIntPipe) levelId: number,
            @Param('id') id: number
            ): Promise<number> {
        this.log.debug({
            message: 'delete ncos set level by id',
            id: levelId,
            func: this.deleteLevel.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const response = await this.ncosSetService.deleteLevel(id, levelId, sr)
        await this.journalService.writeJournal(sr, levelId, {})
        return response
    }

    @Get(':id?/levels/:levelId/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journalLevel(
        @Req() req: Request,
        @Param('id') id: number,
        @Param('levelId') levelId: number
        ) {
        this.log.debug({
            message: 'read ncos set journal level by id',
            id: levelId,
            func: this.journalLevel.name,
            url: req.url,
            method: req.method
        })
        return super.journal(levelId, req)
    }


    /* NCOS Set */


    @Post()
    @ApiCreatedResponse({
        type: NCOSSetResponseDto,
    })
    async create(entity: NCOSSetCreateDto, req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'create ncos set',
            func: this.create.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const set = await this.ncosSetService.create(
            Object.assign(new NCOSSetCreateDto(), entity).toInternal(),
            sr,
        )
        const response = new NCOSSetResponseDto(req.url, set)
        await this.journalService.writeJournal(sr, set.id, response)
        return response
    }

    @Post('bulk')
    @ApiCreatedResponse({
        type: [NCOSSetResponseDto],
    })
    async createMany(
        @Body(new ParseArrayPipe({items: NCOSSetCreateDto})) createDto: NCOSSetCreateDto[],
        @Req() req: Request,
    ): Promise<NCOSSetResponseDto[]> {
        this.log.debug({
            message: 'create ncos set bulk',
            func: this.createMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ncosSetService.createMany(sets, sr)
        return await Promise.all(created.map(async set => new NCOSSetResponseDto(req.url, set)))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSSetResponseDto)
    async readAll(@Req() req: Request): Promise<[NCOSSetResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos set',
            func: this.readAll.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosSetService.readAll(sr)
        const responseList = entity.map(e => new NCOSSetResponseDto(req.url, e))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: NCOSSetResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'read ncos set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method
        })
        return new NCOSSetResponseDto(
            req.url,
            await this.ncosSetService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: NCOSSetResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: NCOSSetUpdateDto, req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'update ncos set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const entity = await this.ncosSetService.update(
            id,
            Object.assign(new NCOSSetUpdateDto(), dto).toInternal(),
            sr,
        )
        const response = new NCOSSetResponseDto(req.url, entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'patch ncos set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const entity = await this.ncosSetService.adjust(id, patch, sr)
        const response = new NCOSSetResponseDto(req.url, entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseIntPipe) id: number, req: Request): Promise<number> {
        this.log.debug({
            message: 'delete ncos set by id',
            id: id,
            func: this.delete.name,
            url: req.url,
            method: req.method
        })
        const sr = new ServiceRequest(req)
        const response = await this.ncosSetService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request) {
        this.log.debug({
            message: 'read ncos set journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method
        })
        return super.journal(id, req)
    }

}
