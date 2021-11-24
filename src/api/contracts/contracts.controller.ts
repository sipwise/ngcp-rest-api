import {Controller, Get, Param, ParseIntPipe, Patch, Post, Put, StreamableFile} from '@nestjs/common'
import {Auth} from '../../decorators/auth.decorator'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {ContractCreateDto} from './dto/contract-create.dto'
import {ContractResponseDto} from './dto/contract-response.dto'
import {ContractsService} from './contracts.service'
import {JournalsService} from '../journals/journals.service'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {RBAC_ROLES} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'
import {ServiceRequest} from 'interfaces/service-request.interface'

const resourceName = 'contracts'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system)
@ApiTags('Contracts')
@Controller('contracts')
export class ContractsController extends CrudController<ContractCreateDto, ContractResponseDto> {

    constructor(
        private readonly contractsService: ContractsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, contractsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ContractResponseDto,
    })
    async create(entity: ContractCreateDto, req: Request): Promise<ContractResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [ContractResponseDto],
    })
    async readAll(page, rows): Promise<ContractResponseDto[]> {
        return this.contractsService.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number): Promise<ContractResponseDto> {
        return this.contractsService.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: ContractCreateDto): Promise<ContractResponseDto> {
        return this.contractsService.update(id, dto)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[]): Promise<ContractResponseDto> {
        return this.contractsService.adjust(id, patch)
    }

    // DELETE is not allowed for Contracts
    // @Delete(':id')
    // async delete(id): Promise<number> {
    //     return super.delete(id)
    // }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
