import {Injectable} from '@nestjs/common'
import {Logger as TypeormLogger, LoggerOptions, QueryRunner} from 'typeorm'
import winston from 'winston'

import {winstonLoggerConfig} from '~/config/logger.config'

@Injectable()
export class TypeormLoggerService implements TypeormLogger {
    private readonly logger: winston.Logger
    private readonly context = 'TypeORM'

    constructor(private readonly options?: LoggerOptions) {
        this.logger = winston.createLogger(winstonLoggerConfig)
    }

    log(level: 'log' | 'info' | 'warn', message: string, _queryRunner?: QueryRunner): void {
        this.logger.log(level, message, {context: this.context})
    }

    logMigration(message: string, _queryRunner?: QueryRunner): void {
        this.logger.info(message, {context: this.context})
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
        this.logger.debug(query, {parameters: parameters, context: this.context})
    }

    logQueryError(error: string | Error, query: string, parameters?: unknown, _queryRunner?: QueryRunner): void {
        if (!(this.options === 'all' ||
            this.options === true ||
            (Array.isArray(this.options) && this.options.indexOf('error') !== -1)))
            return
        const message: string = error instanceof Error ? error.message : error
        this.logger.error(message, {query: query, parameters: parameters, context: this.context})
    }

    logQuerySlow(time: number, query: string, parameters?: unknown, _queryRunner?: QueryRunner): void {
        this.logger.warn(`query is slow (+${time}): ` + query, {parameters: parameters, context: this.context})
    }

    logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
        if (this.options === 'all' || (Array.isArray(this.options) && this.options.indexOf('schema') !== -1)) {
            this.logger.info(message, {context: this.context})
        }
    }

}
