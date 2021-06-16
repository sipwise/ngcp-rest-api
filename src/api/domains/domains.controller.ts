import {Controller, Inject} from '@nestjs/common'
import {Domain} from '../../entities/db/billing/domain.entity'
import {DomainsService} from './domains.service'
import {JOURNAL_SERVICE} from '../../config/constants.config'
import {JournalsService} from '../journals/journals.service'
import {CrudController} from "../../controllers/crud.controller";

const resourceName = 'domains'

@Controller(resourceName)
export class DomainsController extends CrudController<Domain> {

    constructor(
        private readonly domainsService: DomainsService,
        @Inject(JOURNAL_SERVICE)
        private readonly journalsService: JournalsService,
    ) {
        super(
            resourceName,
            domainsService,
            journalsService,
        )
    }
}
