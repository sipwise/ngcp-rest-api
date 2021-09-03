import {Controller} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {Auth} from '../../decorators/auth.decorator'
import {JournalsService} from '../journals/journals.service'
import {DomainsService} from './domains.service'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'

const resourceName = 'domains'

@Auth('system','admin','reseller')
@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    constructor(
        private readonly domainsService: DomainsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, domainsService, journalsService)
    }
}
