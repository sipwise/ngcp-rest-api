import {
    Body,
    Controller,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    forwardRef,
} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'

import {ContractService} from './contract.service'
import {ContractRequestDto} from './dto/contract-request.dto'
import {ContractResponseDto} from './dto/contract-response.dto'
import {ContractSearchDto} from './dto/contract-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
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

const resourceName = 'contracts'

@Auth(
    RbacRole.admin,
    RbacRole.system,
)
@ApiTags('Contract')
@Controller(resourceName)
export class ContractController extends CrudController<ContractRequestDto, ContractResponseDto> {
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
    @ApiCreatedResponse(ContractResponseDto)
    @ApiBody({
        type: ContractRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: ContractRequestDto})) createDto: ContractRequestDto[],
        @Req() req: Request,
    ): Promise<ContractResponseDto[]> {
        this.log.debug({
            message: 'create contracts',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const contracts = createDto.map(contract => contract.toInternal())
        const created = await this.contractService.create(contracts, sr)
        return created.map((contract) => new ContractResponseDto(contract))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ContractResponseDto)
    async readAll(@Req() req: Request): Promise<[ContractResponseDto[], number]> {
        this.log.debug({message: 'fetch all contracts', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [contracts, totalCount] =
            await this.contractService.readAll(sr)
        const responseList = contracts.map(contract => new ContractResponseDto(contract))
        if (sr.query.expand) {
            const contractSearchDtoKeys = Object.keys(new ContractSearchDto())
            await this.expander.expandObjects(responseList, contractSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<ContractResponseDto> {
        this.log.debug({message: 'fetch contract by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contract = await this.contractService.read(id, new ServiceRequest(req))
        const response = new ContractResponseDto(contract)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const contractSearchDtoKeys = Object.keys(new ContractSearchDto())
            await this.expander.expandObjects([response], contractSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, update: ContractRequestDto, req): Promise<ContractResponseDto> {
        this.log.debug({message: 'update contract by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Contract>()
        updates[id] = update.toInternal({id: id, assignNulls: true})
        await this.contractService.update(updates, sr)

        const response = new ContractResponseDto(await this.contractService.read(id, sr))
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(ContractRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: ContractRequestDto})) updates: Dictionary<ContractRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update contracts bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const contracts = new Dictionary<internal.Contract>()
        for (const id of Object.keys(updates)) {
            const dto: ContractRequestDto = updates[id]
            contracts[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }

        return await this.contractService.update(contracts, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: ContractResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<ContractResponseDto> {
        this.log.debug({message: 'patch contract by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.contractService.read(id, sr)
        const entity = await patchToEntity<internal.Contract, ContractRequestDto>(oldEntity, patch, ContractRequestDto)
        const update = new Dictionary<internal.Contract>(id.toString(), entity)

        const ids = await this.contractService.update(update, sr)
        const updatedEntity = await this.contractService.read(ids[0], sr)
        const response = new ContractResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.Contract>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.contractService.read(+id, sr)
            const entity = await patchToEntity<internal.Contract, ContractRequestDto>(oldEntity, patches[id], ContractRequestDto)
            updates[id] = entity
        }

        return await this.contractService.update(updates, sr)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch contract journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
