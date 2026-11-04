import {Injectable, LogLevel, LoggerService as NestLoggerService} from '@nestjs/common'
import {WinstonModule} from 'nest-winston'

import {winstonLoggerConfig} from '~/config/winston-logger.config'

export const winstonLogger: NestLoggerService = WinstonModule.createLogger(winstonLoggerConfig)

const logLevelOrder: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal']

// no optional chaining: webpack's DefinePlugin turns process.env.API_LOG_LEVELS?.split() into undefined.split()
const envLogLevels = process.env.API_LOG_LEVELS
    ? process.env.API_LOG_LEVELS
        .split(',')
        .map(l => l.trim())
        .filter((l): l is LogLevel => logLevelOrder.includes(l as LogLevel))
    : undefined

@Injectable()
export class LoggerService implements NestLoggerService {
    private readonly silencedContexts = ['RouterExplorer', 'RoutesResolver', 'InstanceLoader']
    private readonly silencedLegacyWarnContext = ['LegacyRouteConverter']
    // static: the app creates its own instances (new LoggerService(ctx)), they all share the levels
    private static levels: LogLevel[] = envLogLevels ?? logLevelOrder

    constructor(private readonly context?: string) {}

    // same as nest's isLogLevelEnabled: a listed level and every level above the highest listed one
    private enabled(level: LogLevel): boolean {
        const levels = LoggerService.levels
        if (!levels.length)
            return false
        if (levels.includes(level))
            return true
        const highest = Math.max(...levels.map(l => logLevelOrder.indexOf(l)))
        return logLevelOrder.indexOf(level) >= highest
    }

    setLogLevels(levels: LogLevel[]): void {
        LoggerService.levels = levels
    }

    log(message: unknown, context?: string): void {
        if (!this.enabled('log'))
            return
        const ctx = context ?? this.context
        if (ctx && this.silencedContexts.includes(ctx))
            return
        winstonLogger.log(message, ctx)
    }

    debug(message: unknown, context?: string): void {
        if (!this.enabled('debug'))
            return
        winstonLogger.debug(message, context ?? this.context)
    }

    warn(message: unknown, context?: string): void {
        if (!this.enabled('warn'))
            return
        const ctx = context ?? this.context
        if (ctx && this.silencedLegacyWarnContext.includes(ctx))
            return
        winstonLogger.warn(message, context ?? this.context)
    }

    error(message: unknown, trace?: string, context?: string): void {
        if (!this.enabled('error'))
            return
        winstonLogger.error(message, trace, context ?? this.context)
    }

    verbose(message: unknown, context?: string): void {
        if (!this.enabled('verbose'))
            return
        winstonLogger.verbose?.(message, context ?? this.context)
    }
}