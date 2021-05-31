import {Provider} from '@nestjs/common'
import {JOURNAL_OBJECT_REPOSITORY, JOURNAL_V2_REPOSITORY} from '../../core/constants'
import {JournalObject, JournalV2} from './journalV2.entity'
import {JournalV2Service} from './journalV2Service'

export const journalProviders: Provider<any>[] = [
    {
        provide: JOURNAL_V2_REPOSITORY,
        useValue: JournalV2,
    },
    {
        provide: JOURNAL_OBJECT_REPOSITORY,
        useValue: JournalObject,
    },
    {
        provide: 'JOURNAL_V2_SERVICE',
        useClass: JournalV2Service,
    },
]
