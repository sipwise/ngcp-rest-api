import {ApiBody, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {CallforwardCreateDto} from './dto/callforward-create.dto'
import {CallforwardResponseDto} from './dto/callforward-response.dto'
import {CallforwardsService} from './callforwards.service'
import {Controller, Delete, Get, Patch, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {Operation} from 'fast-json-patch'
import {PatchDto} from '../patch.dto'
import {RBAC_ROLES} from '../../config/constants.config'
import {Request} from 'express'

const resourceName = 'callforwards'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Call forwards')
export class CallforwardsController extends CrudController<CallforwardCreateDto, CallforwardResponseDto> {

    constructor(
        private readonly callforwardsService: CallforwardsService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, callforwardsService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [CallforwardResponseDto],
    })
    async readAll(page: number, rows: number): Promise<CallforwardResponseDto[]> {
        return super.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: CallforwardResponseDto,
    })
    async read(id: number): Promise<CallforwardResponseDto> {
        return super.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CallforwardResponseDto,
    })
    async update(id: number, dto: CallforwardCreateDto, req: Request): Promise<CallforwardResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CallforwardResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<CallforwardResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: CallforwardResponseDto,
    })
    async delete(id , req): Promise<number> {
        return super.delete(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
