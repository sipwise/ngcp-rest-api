import {Controller, Delete, Get, Param, Req} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {string} from 'yargs'

import {BanRegistrationService} from './ban-registration.service'
import {BanRegistrationResponseDto} from './dto/ban-registration-response.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {sortAndPaginate} from '~/helpers/sort-and-paginate'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseUUIDArrayPipe} from '~/pipes/parse-uuid-array.pipe'
import {ParseUUIDPipe} from '~/pipes/parse-uuid.pipe'

const resourceName = 'bans/registrations'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Ban')
@Controller(resourceName)
export class BanRegistrationController {
    private readonly log = new LoggerService(BanRegistrationController.name)

    constructor(
        private readonly banService: BanRegistrationService,
        private readonly journalService: JournalService,
    ) {
    }

    @Get('')
    @ApiPaginatedResponse(BanRegistrationResponseDto)
    async readAll(
        @Req() req: Request): Promise<[BanRegistrationResponseDto[], number]> {
        this.log.debug({
            message: 'read all ban registrations',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const entities = await this.banService.readAll(sr)
        const responseList = entities.map(e => new BanRegistrationResponseDto(e))
        const sortedResponseList = sortAndPaginate<BanRegistrationResponseDto>(responseList, sr, 'id')
        return [sortedResponseList, responseList.length]
    }

    @Get(':id')
    @ApiOkResponse({
        type: BanRegistrationResponseDto,
    })
    async read(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Req() req: Request,
    ): Promise<BanRegistrationResponseDto> {
        this.log.debug({
            message: 'read ban registration by entry',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const user = await this.banService.read(id, sr)
        const responseItem = new BanRegistrationResponseDto(user)
        return responseItem
    }

    @Delete(':id')
    @ApiOkResponse({
        type: [string],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseUUIDArrayPipe()) ids: string[],
        @Req() req: Request,
    ): Promise<string[]> {
        this.log.debug({
            message: 'delete ban registration by entry',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.banService.delete(ids, sr)
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
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
