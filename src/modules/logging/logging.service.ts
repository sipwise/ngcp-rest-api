import {Injectable, LoggerService} from '@nestjs/common'
import * as winston from 'winston'
import {Syslog, SyslogTransportOptions} from 'winston-syslog'

const opt: SyslogTransportOptions = {
    path: '/dev/log',
    protocol: 'unix',
    localhost: '',
    format: winston.format.simple(),
}

@Injectable()
export class LoggingService implements LoggerService {

    private logger: winston.Logger

    constructor() {
        //if (process.env.ENVIRONMENT === 'production') {
        this.logger = winston.createLogger({
            levels: winston.config.syslog.levels,
            defaultMeta: {service: LoggingService.name},
            format: winston.format.simple(),
            transports: [
                new Syslog(opt),
            ],
        })
        /*
        } else {
            this.logger = winston.createLogger({
                levels: winston.config.syslog.levels,
                defaultMeta: {service: LoggingService.name},
                format: winston.format.simple(),
                transports: [
                    new winston.transports.Console(),
                ],
            })
            // TODO: write both transports when debug?
        }
        */
    }

    error(message: any, trace?: string, context?: string): any {
        this.logger.error(message, trace)
    }

    log(message: any, context?: string): any {
        this.logger.log('info', message)
    }

    warn(message: any, context?: string): any {
        this.logger.warn(message)
    }

    debug(message: any, context?: string): any {
    }

    verbose(message: any, context?: string): any {
    }
}
