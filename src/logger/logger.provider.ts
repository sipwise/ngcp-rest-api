import {Provider} from '@nestjs/common'
import {LOGGER_SERVICE} from '../config/constants.config'
import {LoggerService} from './logger.service'

export const loggerProvider: Provider<any>[] = [
    {
        provide: LOGGER_SERVICE,
        useClass: LoggerService,
    },
]
