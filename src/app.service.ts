import {Inject, Injectable, Logger} from '@nestjs/common'
import {Redis} from 'ioredis'
import {DataSource, EntityManager, EntityTarget, Repository} from 'typeorm'

import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    static readonly config = AppConfig
    public readonly config = AppConfig

    private dbAvailable = true
    private redisAvailable = true

    constructor(
        @Inject(Logger) private readonly defaultLogger: Logger,
        @Inject('DB') private readonly defaultDatabase: DataSource,
        @Inject('Redis') private readonly redisDatabase: Redis,
        @Inject('RedisPubSub') private readonly redisPubSubDatabase: Redis,
    ) {
    }

    get isDbInitialised(): boolean {
        return this.db.isInitialized
    }

    get isDbAvailable(): boolean {
        return this.dbAvailable
    }

    set setDbAvailable(dbAvailable: boolean) {
        this.dbAvailable = dbAvailable
    }

    get db(): DataSource {
        return this.defaultDatabase
    }

    public dbConnection(): EntityManager {
        return this.db.manager
    }

    public dbRepo<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
        return this.dbConnection().getRepository(target)
    }

    get isRedisAvailable(): boolean {
        return this.redisAvailable
    }

    set setRedisAvailable(redisAvailable: boolean) {
        this.redisAvailable = redisAvailable
    }

    get redis(): Redis {
        return this.redisDatabase
    }

    get redisPubSub(): Redis {
        return this.redisPubSubDatabase
    }

    public logger(): Logger {
        return this.defaultLogger
    }
}
