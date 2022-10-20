import {Body, Controller, Post, Req} from '@nestjs/common'
import {ApiCreatedResponse, ApiExtraModels, ApiTags} from '@nestjs/swagger'
import {ClearCallCounterCreateDto} from './dto/clearcallcounter-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {LoggerService} from '../../logger/logger.service'
import {ClearCallCountersService} from './clearcallcounters.service'
import {internal} from '../../entities'

const resourceName = 'clearcallcounters'

@Auth(RbacRole.system)
@ApiTags('Clear Call Counters')
@Controller(resourceName)
export class ClearCallCountersController extends CrudController<ClearCallCounterCreateDto, never> {
    private readonly log = new LoggerService(ClearCallCountersController.name)

    constructor(
        private readonly clearCallCountersService: ClearCallCountersService,
    ) {
        super(resourceName, clearCallCountersService)
    }

    @Post()
    async create(createDto: ClearCallCounterCreateDto, req) {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = this.newServiceRequest(req)
        const callId = new internal.CallId(createDto.call_id)
        await this.clearCallCountersService.create(callId, sr)
    }
}
