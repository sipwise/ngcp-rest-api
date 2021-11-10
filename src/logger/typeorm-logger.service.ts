import {Logger as TypeormLogger, QueryRunner} from 'typeorm'
import {Injectable} from '@nestjs/common'
import * as winston from 'winston'
import {winstonLoggerConfig} from '../config/logger.config'

@Injectable()
export class TypeormLoggerService implements TypeormLogger {
    private logger: winston.Logger
    private context = 'TypeORM'

    constructor() {
        this.logger = winston.createLogger(winstonLoggerConfig)
    }

    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
        this.logger.log(level, message, {context: this.context})
    }

    logMigration(message: string, queryRunner?: QueryRunner): any {
        this.logger.info(message, {context: this.context})
    }

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        if (query == "select 1") {
            // do not log ping queries
            return
        }
        this.logger.debug(query, {parameters: parameters, context: this.context})
    }

    logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        let message: string

        message = error instanceof Error ? error.message : error
        this.logger.error(message, {query: query, parameters: parameters, context: this.context})
    }

    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
    }

}
