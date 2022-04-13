import {Controller, forwardRef, Get, Inject, Logger, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
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
import {ContractsService} from './contracts.service'
import {JournalsService} from '../journals/journals.service'
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

const resourceName = 'contracts'

@Auth(RbacRole.admin, RbacRole.system)
@ApiTags('Contracts')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ContractsController extends CrudController<ContractCreateDto, ContractResponseDto> {

    private readonly log: Logger = new Logger(ContractsController.name)

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
        this.log.debug({message: 'create contract', func: this.create.name, url: req.url, method: req.method})
        return this.contractsService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ContractResponseDto)
    async readAll(req): Promise<[ContractResponseDto[], number]> {
        this.log.debug({message: 'fetch all contracts', func: this.readAll.name, url: req.url, method: req.method})
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
        this.log.debug({message: 'fetch contract by id', func: this.read.name, url: req.url, method: req.method})
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
        this.log.debug({message: 'update contract by id', func: this.update.name, url: req.url, method: req.method})
        return this.contractsService.update(id, dto, this.newServiceRequest(req))
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
        this.log.debug({message: 'fetch contract journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, page, row, req)
    }
}
