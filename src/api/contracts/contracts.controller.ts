import {Controller, Get, Patch, Post, Put} from '@nestjs/common'
import {Auth} from '../../decorators/auth.decorator'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {ContractCreateDto} from './dto/contract-create.dto'
import {ContractResponseDto} from './dto/contract-response.dto'
import {ContractsService} from './contracts.service'
import {JournalsService} from '../journals/journals.service'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {RBAC_ROLES} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'

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
    async readAll(page, rows, req): Promise<ContractResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async read(id, req): Promise<ContractResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async update(id, dto: ContractCreateDto, req: Request): Promise<ContractResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id, patch: Operation[], req: Request): Promise<ContractResponseDto> {
        return super.adjust(id, patch, req)
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
    async journal(id, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
