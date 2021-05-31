import {Provider} from '@nestjs/common'
import {JOURNAL_REPOSITORY} from '../../core/constants'
import {Journal} from './journal.entity'
import {JournalService} from './journal.service'

export const journalProviders: Provider<any>[] = [
    {
        provide: JOURNAL_REPOSITORY,
        useValue: Journal,
    },
    {
        provide: 'JOURNAL_SERVICE',
        useClass: JournalService,
    },
]
