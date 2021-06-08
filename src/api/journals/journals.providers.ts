import {Provider} from '@nestjs/common'
import {JOURNAL_REPOSITORY, JOURNAL_SERVICE} from '../../config/constants.config'
import {Journal} from '../../entities/db/billing/journal.entity'
import {JournalsService} from './journals.service'

export const journalsProviders: Provider<any>[] = [
    {
        provide: JOURNAL_REPOSITORY,
        useValue: Journal,
    },
    {
        provide: JOURNAL_SERVICE,
        useClass: JournalsService,
    },
]
