import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Post,
    Req,
    forwardRef,
} from '@nestjs/common'
import {ApiBody, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {DomainService} from './domain.service'
import {DomainRequestDto} from './dto/domain-request.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainSearchDto} from './dto/domain-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {Roles} from '~/decorators/roles.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'


const resourceName = 'domains'

@Auth(
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.system,
)
@ApiTags('Domain')
@Controller(resourceName)
export class DomainController extends CrudController<DomainRequestDto, DomainResponseDto> {
    private readonly log = new LoggerService(DomainController.name)

    constructor(
        private readonly domainService: DomainService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, domainService, journalService)
    }


    @Post()
    @ApiCreatedResponse(DomainResponseDto)
    @ApiBody({
        type: DomainRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: DomainRequestDto})) createDto: DomainRequestDto[],
        @Req() req: Request,
    ): Promise<DomainResponseDto[]> {
        this.log.debug({
            message: 'create domains',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const domains = createDto.map(domain => domain.toInternal())
        const created = await this.domainService.create(domains, sr)
        return created.map((domain) => new DomainResponseDto(domain))
    }

    @Get()
    @Roles(RbacRole.ccare, RbacRole.ccareadmin)
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(DomainResponseDto)
    async readAll(@Req() req: Request): Promise<[DomainResponseDto[], number]> {
        this.log.debug({message: 'fetch all domains', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [domains, totalCount] =
            await this.domainService.readAll(sr)
        const responseList = domains.map(dom => new DomainResponseDto(dom))
        if (sr.query.expand) {
            const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseList, domainSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @Roles(RbacRole.ccare, RbacRole.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<DomainResponseDto> {
        this.log.debug({message: 'fetch domain by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const domain = await this.domainService.read(id, sr)
        const responseItem = new DomainResponseDto(domain)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects([responseItem], domainSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @Param('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'delete domain by id', func: this.delete.name, url: req.url, method: req.method})

        const sr = new ServiceRequest(req)
        const deletedIds = await this.domainService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'read domain journal by id', func: this.delete.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

}
