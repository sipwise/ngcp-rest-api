import {Body, Controller, Post} from '@nestjs/common'
import {ApiBody, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {LoggerService} from '../../logger/logger.service'
import {ClearCallCounterService} from './clear-call-counter.service'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ClearCallCounterRequestDto} from './dto/clear-call-counter-request.dto'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'

const resourceName = 'clearcallcounters'

@Auth(RbacRole.system)
@ApiTags('ClearCallCounter')
@Controller(resourceName)
export class ClearCallCounterController extends CrudController<ClearCallCounterRequestDto, never> {
    private readonly log = new LoggerService(ClearCallCounterController.name)

    constructor(
        private readonly clearCallCounterService: ClearCallCounterService,
    ) {
        super(resourceName, clearCallCounterService)
    }

    @Post()
    @ApiBody({
        type: ClearCallCounterRequestDto,
        isArray: true,
    })
    async create(@Body(new ParseOneOrManyPipe({items: ClearCallCounterRequestDto})) createDto: ClearCallCounterRequestDto[], req) {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const callId = new internal.CallId(createDto[0].call_id)
        await this.clearCallCounterService.create(callId, sr)
    }
}
