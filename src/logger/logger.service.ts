import {Injectable, LoggerService as NestLoggerService} from '@nestjs/common'
import winston from 'winston'
import {winstonLoggerConfig} from '../config/logger.config'

@Injectable()
export class LoggerService implements NestLoggerService {

    private logger: winston.Logger

    constructor() {
        this.logger = winston.createLogger(winstonLoggerConfig)
    }

    error(message: any, trace?: string, context?: string): any {
        this.logger.error(message, trace, {context: context})
    }

    log(message: any, context?: string): any {
        this.logger.log('info', message, {context: context})
    }

    warn(message: any, context?: string): any {
        this.logger.warn(message, {context: context})
    }

    debug(message: any, context?: string): any {
        this.logger.log('debug', message, {context: context})
    }

    verbose(message: any, context?: string): any {
        this.logger.verbose(message, context)
    }
}
