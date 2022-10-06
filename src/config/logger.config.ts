import winston, {LoggerOptions} from 'winston'
import {Syslog} from 'winston-syslog'
import {utilities} from 'nest-winston'

export const winstonLoggerConfig: LoggerOptions = {
    // TODO: Set level when template supports log_level setting
    // level: process.env.NODE_ENV == 'development' ? 'debug' : config.common.log_level,
    level: 'debug',
    levels: winston.config.syslog.levels,
    format: winston.format.simple(),
    transports: [
        process.env.NODE_ENV == 'production' &&
        process.env.NODE_CONSOLE !== 'true' &&
        process.env.NODE_CONSOLE !== '1'
            ? new Syslog({
                path: '/dev/log',
                protocol: 'unix',
                localhost: '',
                format: winston.format.simple(),
            })
            : new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.ms(),
                    utilities.format.nestLike('ngcp-rest-api', {prettyPrint: true}),
                ),
            })
    ],
}
