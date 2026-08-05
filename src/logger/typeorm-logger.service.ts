import {Injectable} from '@nestjs/common'
import {Logger as TypeormLogger, LoggerOptions, QueryRunner} from 'typeorm'

import {winstonLogger} from './logger.service'

@Injectable()
export class TypeormLoggerService implements TypeormLogger {
    private readonly silencedContexts = ['TypeORM']
    private readonly silencedMessagePrefixes = ['All classes found using provided glob pattern']
    private readonly context = 'TypeORM'

    constructor(private readonly options?: LoggerOptions) {}

    log(level: 'log' | 'info' | 'warn', message: string, _queryRunner?: QueryRunner): void {
        const ctx = this.context
        if (ctx && this.silencedContexts.includes(ctx)) {
            if (this.silencedMessagePrefixes.some(prefix => message.startsWith(prefix)))
                return
        }
        winstonLogger.log({level: level, message, context: ctx})
    }

    logMigration(message: string, _queryRunner?: QueryRunner): void {
        winstonLogger.log({level: 'info', message, context: this.context})
    }

    logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
        if (!(this.options === 'all' ||
            this.options === true ||
            (Array.isArray(this.options) && this.options.indexOf('query') !== -1)))
            return
        if (query == 'select 1' || query == 'SELECT DATABASE() AS `db_name`' ||
            query == 'DELETE FROM `fileshare`.`uploads` WHERE `expires_at` <= ?') {
            // do not log ping queries and fileshare schedule deletes
            return
        }
        winstonLogger.log({level: 'debug', message: query, parameters, context: this.context})
    }

    logQueryError(error: string | Error, query: string, parameters?: unknown, _queryRunner?: QueryRunner): void {
        if (!(this.options === 'all' ||
            this.options === true ||
            (Array.isArray(this.options) && this.options.indexOf('error') !== -1)))
            return
        const message: string = error instanceof Error ? error.message : error
        winstonLogger.log({level: 'error', message, query, parameters, context: this.context})
    }

    logQuerySlow(time: number, query: string, parameters?: unknown, _queryRunner?: QueryRunner): void {
        winstonLogger.log({level: 'warn', message: `query is slow (+${time}): ` + query, parameters, context: this.context})
    }

    logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
        if (this.options === 'all' || (Array.isArray(this.options) && this.options.indexOf('schema') !== -1)) {
            winstonLogger.log({level: 'info', message, context: this.context})
        }
    }
}
