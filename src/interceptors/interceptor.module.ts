import {Module} from '@nestjs/common'
import {JournalsModule} from '../api/journals/journals.module'
import {LoggerModule} from '../logger/logger.module'
import {LoggerService} from '../logger/logger.service'
import {JournalingInterceptor} from './journaling.interceptor'
import {LoggingInterceptor} from './logging.interceptor'

@Module({
    imports: [JournalsModule, LoggerModule],
    providers: [JournalingInterceptor, LoggingInterceptor, LoggerService],
    exports: [JournalsModule, LoggerModule],
})
export class InterceptorModule {
}
