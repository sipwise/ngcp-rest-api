import {Module,forwardRef} from '@nestjs/common'

import {LoggingInterceptor} from './logging.interceptor'

import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'

@Module({
    imports: [
        forwardRef(() => JournalModule),
    ],
    providers: [LoggingInterceptor, JournalService],
    exports: [JournalModule],
})
export class InterceptorModule {
}
