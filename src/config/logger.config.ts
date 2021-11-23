import winston from 'winston'
import {LoggerOptions} from 'winston'
import {Syslog} from 'winston-syslog'
import {utilities} from 'nest-winston'

export const winstonLoggerConfig: LoggerOptions = {
    // TODO: Set level when template supports log_level setting
    // level: process.env.NODE_ENV == 'development' ? 'debug' : config.common.log_level,
    level: 'debug',
    levels: winston.config.syslog.levels,
    format: winston.format.simple(),
    transports: [
        process.env.NODE_ENV == 'development'
            ? new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.ms(),
                        utilities.format.nestLike('ngcp-rest-api', {prettyPrint: true}),
                    ),
                },
            )
            : new Syslog({
                path: '/dev/log',
                protocol: 'unix',
                localhost: '',
                format: winston.format.simple(),
            }),
    ],
}
