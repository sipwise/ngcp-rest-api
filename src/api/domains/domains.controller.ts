import {Controller, Inject} from '@nestjs/common'
import {DomainsService} from './domains.service'
import {JournalsService} from '../journals/journals.service'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {AppService} from 'app.sevice'

const resourceName = 'domains'

@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    constructor(
        private readonly domainsService: DomainsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, domainsService, journalsService)
    }
}
