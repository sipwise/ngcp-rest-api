import {Controller, Inject} from '@nestjs/common'
import {DomainsService} from './domains.service'
import {JOURNAL_SERVICE} from '../../config/constants.config'
import {JournalsService} from '../journals/journals.service'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'

const resourceName = 'domains'

@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    constructor(
        private readonly domainsService: DomainsService,
        @Inject(JOURNAL_SERVICE)
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, domainsService, journalsService)
    }
}
