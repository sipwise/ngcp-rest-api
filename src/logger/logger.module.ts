import {Module} from '@nestjs/common'
import {loggerProvider} from './logger.provider'

@Module({
    providers: [...loggerProvider],
    exports: [...loggerProvider],
})
export class LoggerModule {
}
