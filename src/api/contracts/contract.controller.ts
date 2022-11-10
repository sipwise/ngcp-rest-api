import {Controller, forwardRef, Get, Inject, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
import {Auth} from '../../decorators/auth.decorator'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {ContractCreateDto} from './dto/contract-create.dto'
import {ContractResponseDto} from './dto/contract-response.dto'
import {ContractService} from './contract.service'
import {JournalService} from '../journals/journal.service'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {RbacRole} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ContractSearchDto} from './dto/contract-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'contracts'

@Auth(RbacRole.admin, RbacRole.system)
@ApiTags('Contract')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ContractController extends CrudController<ContractCreateDto, ContractResponseDto> {
    private readonly log = new LoggerService(ContractController.name)

    constructor(
        private readonly contractService: ContractService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contractService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ContractResponseDto,
    })
    async create(entity: ContractCreateDto, req: Request): Promise<ContractResponseDto> {
        this.log.debug({message: 'create contract', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contract = await this.contractService.create(entity.toInternal(), sr)
        const response = new ContractResponseDto(contract)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ContractResponseDto)
    async readAll(req): Promise<[ContractResponseDto[], number]> {
        this.log.debug({message: 'fetch all contracts', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [contracts, totalCount] =
            await this.contractService.readAll(sr)
        const responseList = contracts.map(contract => new ContractResponseDto(contract))
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
        this.log.debug({message: 'fetch contract by id', func: this.read.name, url: req.url, method: req.method})
        const contract = await this.contractService.read(id, new ServiceRequest(req))
        const response = new ContractResponseDto(contract)
        if (req.query.expand && !req.isRedirected) {
            const contractSearchDtoKeys = Object.keys(new ContractSearchDto())
            await this.expander.expandObjects(response, contractSearchDtoKeys, req)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, update: ContractCreateDto, req): Promise<ContractResponseDto> {
        this.log.debug({message: 'update contract by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contract = await this.contractService.update(id, update.toInternal(), sr)
        const response = new ContractResponseDto(contract)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<ContractResponseDto> {
        this.log.debug({message: 'patch contract by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contract = await this.contractService.adjust(id, patch, sr)
        const response = new ContractResponseDto(contract)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, req) {
        this.log.debug({
            message: 'fetch contract journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
