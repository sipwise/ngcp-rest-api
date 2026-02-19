import {Controller, Delete, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {BanIpService} from './ban-ip.service'
import {BanIpResponseDto} from './dto/ban-ip-response.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'

const resourceName = 'bans/ips'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Ban')
@Controller(resourceName)
export class BanIpController {
    private readonly log = new LoggerService(BanIpController.name)

    constructor(
        private readonly banService: BanIpService,
        private readonly journalService: JournalService,
    ) {
    }

    @Get('')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(BanIpResponseDto)
    async readAll(
        @Req() req: Request): Promise<[BanIpResponseDto[], number]> {
        this.log.debug({
            message: 'read all ban ips',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entities, total] = await this.banService.readAll(sr)
        const responseList = entities.map(e => new BanIpResponseDto(e))
        return [responseList, total]
    }

    @Get(':id')
    @ApiOkResponse({
        type: BanIpResponseDto,
    })
    async read(
        @Param('id', new ParseIntPipe()) id: number,
        @Req() req: Request,
    ): Promise<BanIpResponseDto> {
        this.log.debug({
            message: 'read ban ip by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const rule = await this.banService.read(id, sr)
        const responseItem = new BanIpResponseDto(rule)
        return responseItem
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
            message: 'delete ban ip by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.banService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [result, count] = await this.journalService.readAll(sr, resourceName, id)
        return [result.map(j => new JournalResponseDto(j)), count]
    }
}
