import {Injectable, LoggerService as NestLoggerService} from '@nestjs/common'
import {WinstonModule} from 'nest-winston'

import {winstonLoggerConfig} from '~/config/winston-logger.config'

export const winstonLogger: NestLoggerService = WinstonModule.createLogger(winstonLoggerConfig)

@Injectable()
export class LoggerService implements NestLoggerService {
    private readonly silencedContexts = ['RouterExplorer', 'RoutesResolver', 'InstanceLoader']
    private readonly silencedLegacyWarnContext = ['LegacyRouteConverter']

    constructor(private readonly context?: string) {}

    log(message: unknown, context?: string): void {
        const ctx = context ?? this.context
        if (ctx && this.silencedContexts.includes(ctx))
            return
        winstonLogger.log(message, ctx)
    }

    debug(message: unknown, context?: string): void {
        winstonLogger.debug(message, context ?? this.context)
    }

    warn(message: unknown, context?: string): void {
        const ctx = context ?? this.context
        if (ctx && this.silencedLegacyWarnContext.includes(ctx))
            return
        winstonLogger.warn(message, context ?? this.context)
    }

    error(message: unknown, trace?: string, context?: string): void {
        winstonLogger.error(message, trace, context ?? this.context)
    }

    verbose(message: unknown, context?: string): void {
        winstonLogger.verbose?.(message, context ?? this.context)
    }
}