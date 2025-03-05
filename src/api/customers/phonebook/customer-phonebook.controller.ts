import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Query, Req, ValidationPipe, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {number} from 'yargs'

import {CustomerPhonebookService} from './customer-phonebook.service'
import {CustomerPhonebookQueryDto} from './dto/customer-phonebook-query.dto'
import {CustomerPhonebookRequestParamDto} from './dto/customer-phonebook-request-param.dto'
import {CustomerPhonebookRequestDto} from './dto/customer-phonebook-request.dto'
import {CustomerPhonebookResponseDto} from './dto/customer-phonebook-response.dto'
import {CustomerPhonebookSearchDto} from './dto/customer-phonebook-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'
import {ParseRegexPipe} from '~/pipes/parse-regex-id.pipe'

const resourceName = 'customers/'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.lintercept,
)
@ApiTags('Customer')
@Controller(resourceName)
@License(LicenseType.phonebook)
export class CustomerPhonebookController extends CrudController<CustomerPhonebookRequestDto, CustomerPhonebookResponseDto> {
    private readonly log = new LoggerService(CustomerPhonebookController.name)

    constructor(
        private readonly phonebookService: CustomerPhonebookService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, phonebookService)
    }

    @Post(':customerId?/phonebook')
    @ApiCreatedResponse(CustomerPhonebookResponseDto)
    @ApiBody({
        type: CustomerPhonebookRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerPhonebookRequestDto})) createDto: CustomerPhonebookRequestDto[],
        @Req() req: Request,
    ): Promise<CustomerPhonebookResponseDto[]> {
        this.log.debug({
            message: 'create phonebook bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const phonebook = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.phonebookService.create(phonebook, sr)
        return await Promise.all(created.map(async phonebook => new CustomerPhonebookResponseDto(phonebook)))
    }

    @Get(':customerId?/phonebook')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerPhonebookResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: CustomerPhonebookRequestParamDto,
        @Query(new ValidationPipe()) _query: CustomerPhonebookQueryDto,
    ): Promise<[CustomerPhonebookResponseDto[], number]> {
        this.log.debug({
            message: 'read all customer phonebook',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.phonebookService.readAll(sr)
        const responseList = entity.map(e => new CustomerPhonebookResponseDto(e))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new CustomerPhonebookSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':customerId?/phonebook/:id')
    @ApiOkResponse({
        type: CustomerPhonebookResponseDto,
    })
    async read(
        @Param('id', new ParseRegexPipe({pattern: /^[csr\d]+$/})) id: string,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerPhonebookRequestParamDto = new CustomerPhonebookRequestParamDto(),
        @Query(new ValidationPipe()) _query: CustomerPhonebookQueryDto,
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'read customer phonebook by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new CustomerPhonebookResponseDto(await this.phonebookService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new CustomerPhonebookSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':customerId?/phonebook/:id')
    @ApiOkResponse({
        type: CustomerPhonebookResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: CustomerPhonebookRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerPhonebookRequestParamDto = new CustomerPhonebookRequestParamDto(),
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'update customer phonebook by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.CustomerPhonebook>()
        updates[id] = Object.assign(new CustomerPhonebookRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.phonebookService.update(updates, sr)
        const entity = await this.phonebookService.read(ids[0], sr)
        const response = new CustomerPhonebookResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':customerId?/phonebook')
    @ApiPutBody(CustomerPhonebookRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerPhonebookRequestDto})) updates: Dictionary<CustomerPhonebookRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update customer phonebook bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.CustomerPhonebook>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerPhonebookRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.phonebookService.update(sets, sr)
    }

    @Patch(':customerId?/phonebook/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<CustomerPhonebookResponseDto> {
        this.log.debug({
            message: 'patch phonebook set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.phonebookService.read(id, sr)
        const entity = await patchToEntity<internal.CustomerPhonebook, CustomerPhonebookRequestDto>(
            oldEntity as internal.CustomerPhonebook, patch, CustomerPhonebookRequestDto,
        )
        const update = new Dictionary<internal.CustomerPhonebook>(id.toString(), entity)

        const ids = await this.phonebookService.update(update, sr)
        const updatedEntity = await this.phonebookService.read(ids[0], sr)
        const response = new CustomerPhonebookResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':customerId?/phonebook')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.CustomerPhonebook>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.phonebookService.read(+id, sr)
            const entity = await patchToEntity<internal.CustomerPhonebook, CustomerPhonebookRequestDto>(
                oldEntity as internal.CustomerPhonebook, patches[id], CustomerPhonebookRequestDto,
            )
            updates[id] = entity
        }

        return await this.phonebookService.update(updates, sr)
    }

    @Delete(':customerId?/phonebook/:id?')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete customer phonebook by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.phonebookService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':customerId?/phonebook/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read phonebook journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
