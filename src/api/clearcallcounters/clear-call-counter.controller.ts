import {Body, Controller, Post, Req} from '@nestjs/common'
import {ApiCreatedResponse, ApiExtraModels, ApiTags} from '@nestjs/swagger'
import {ClearCallCounterCreateDto} from './dto/clear-call-counter-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {LoggerService} from '../../logger/logger.service'
import {ClearCallCounterService} from './clear-call-counter.service'
import {internal} from '../../entities'

const resourceName = 'clearcallcounters'

@Auth(RbacRole.system)
@ApiTags('ClearCallCounter')
@Controller(resourceName)
export class ClearCallCounterController extends CrudController<ClearCallCounterCreateDto, never> {
    private readonly log = new LoggerService(ClearCallCounterController.name)

    constructor(
        private readonly clearCallCounterService: ClearCallCounterService,
    ) {
        super(resourceName, clearCallCounterService)
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
        await this.clearCallCounterService.create(callId, sr)
    }
}
