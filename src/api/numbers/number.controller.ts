import {Controller, Get, Inject, Param, ParseIntPipe, Req, forwardRef} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'

import {NumberResponseDto} from './dto/number-response.dto'
import {NumberService} from './number.service'

import {JournalService} from '~/api/journals/journal.service'
import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {Auth} from '~/decorators/auth.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'numbers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.subscriberadmin,
)
@ApiTags('Number')
@Controller(resourceName)
export class NumberController extends CrudController<never, NumberResponseDto> {
    private readonly log = new LoggerService(NumberController.name)

    constructor(
        private readonly app: AppService,
        private readonly numberService: NumberService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, numberService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [NumberResponseDto],
    })
    async readAll(@Req() req): Promise<[NumberResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all numbers',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = new ServiceRequest(req)
        const [contacts, count] = await this.numberService.readAll(sr)
        const responseList = contacts.map(num => new NumberResponseDto(num, sr.user.role))
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: NumberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<NumberResponseDto> {
        this.log.debug({
            message: 'fetch number by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
            id: id,
        })
        const sr = new ServiceRequest(req)
        const number = await this.numberService.read(id, sr)
        return new NumberResponseDto(number, sr.user.role)
    }
}
