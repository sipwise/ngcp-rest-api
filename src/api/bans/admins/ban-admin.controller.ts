import {Controller, Delete, Get, Inject, Param, ParseIntPipe, Req, forwardRef} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {BanAdminService} from './ban-admin.service'
import {BanAdminResponseDto} from './dto/ban-admin-response.dto'
import {BanAdminSearchDto} from './dto/ban-admin-search.dto'

import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'

const resourceName = 'bans/admins'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.lintercept,
)
@ApiTags('Bans')
@Controller(resourceName)
export class BanAdminController extends CrudController<never, BanAdminResponseDto> {
    private readonly log = new LoggerService(BanAdminController.name)

    constructor(
        private readonly banAdminService: BanAdminService,
        @Inject(forwardRef(() => ExpandHelper)) private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName)
    }

    @Get()
    @ApiPaginatedResponse(BanAdminResponseDto)
    async readAll(@Req() req): Promise<[BanAdminResponseDto[], number]> {
        this.log.debug({
            message: 'read all banned admins',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] = await this.banAdminService.readAll(sr)
        const responseList = entity.map(e => new BanAdminResponseDto(e))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new BanAdminSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }

        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: BanAdminResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<BanAdminResponseDto> {
        this.log.debug({
            message: 'read banned admin by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new BanAdminResponseDto(await this.banAdminService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new BanAdminSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'remove ban for admin by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.banAdminService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }
}
