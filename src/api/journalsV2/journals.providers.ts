import {Provider} from '@nestjs/common'
import {JOURNAL_OBJECT_REPOSITORY, JOURNAL_V2_REPOSITORY} from '../../config/constants.config'
import {Journal, JournalObject} from './journals.entity'
import {JournalsService} from './journals.service'

export const journalsProviders: Provider<any>[] = [
    {
        provide: JOURNAL_V2_REPOSITORY,
        useValue: Journal,
    },
    {
        provide: JOURNAL_OBJECT_REPOSITORY,
        useValue: JournalObject,
    },
    {
        provide: 'JOURNAL_V2_SERVICE',
        useClass: JournalsService,
    },
]
