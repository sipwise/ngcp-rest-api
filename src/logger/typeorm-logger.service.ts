import {Logger as TypeormLogger, QueryRunner} from 'typeorm'
import {Injectable} from '@nestjs/common'
import * as winston from 'winston'
import {winstonLoggerConfig} from '../config/logger.config'

@Injectable()
export class TypeormLoggerService implements TypeormLogger {
    private l: winston.Logger
    private context = "TypeORM"

    constructor() {
        this.l = winston.createLogger(winstonLoggerConfig)
    }

    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
        this.l.log(level, message, {context: this.context})
    }

    logMigration(message: string, queryRunner?: QueryRunner): any {
        this.l.info(message, {context: this.context})
    }

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        this.l.info(query, {parameters: parameters, context: this.context})
    }

    logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        let message: string

        message = error instanceof Error ? error.message : error
        this.l.error(message, {query: query, parameters: parameters, context: this.context})
    }

    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
    }

}
