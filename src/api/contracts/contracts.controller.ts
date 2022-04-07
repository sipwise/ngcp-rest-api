import {Controller, forwardRef, Get, Inject, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
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
import {ExpandHelper} from '../../helpers/expand.helper'
import {ContractSearchDto} from './dto/contract-search.dto'

const resourceName = 'contracts'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system)
@ApiTags('Contracts')
@Controller(resourceName)
export class ContractsController extends CrudController<ContractCreateDto, ContractResponseDto> {

    constructor(
        private readonly contractsService: ContractsService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contractsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ContractResponseDto,
    })
    async create(entity: ContractCreateDto, req: Request): Promise<ContractResponseDto> {
        return this.contractsService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiOkResponse({
        type: [ContractResponseDto],
    })
    async readAll(req): Promise<[ContractResponseDto[], number]> {
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.contractsService.readAll(sr)
        if (req.query.expand) {
            const contractSearchDtoKeys = Object.keys(new ContractSearchDto())
            await this.expander.expandObjects(responseList, contractSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ContractResponseDto> {
        const responseItem = await this.contractsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const contractSearchDtoKeys = Object.keys(new ContractSearchDto())
            await this.expander.expandObjects(responseItem, contractSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: ContractCreateDto, req): Promise<ContractResponseDto> {
        return this.contractsService.update(id, dto, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<ContractResponseDto> {
        return this.contractsService.adjust(id, patch, this.newServiceRequest(req))
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
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        return super.journal(id, page, row, req)
    }
}
