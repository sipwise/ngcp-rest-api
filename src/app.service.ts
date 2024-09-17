import {Inject, Injectable, Logger} from '@nestjs/common'
import {DataSource, EntityTarget} from 'typeorm'
import {Redis, Cluster} from 'ioredis'
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
        @Inject('Redis') private readonly redisDatabase: Redis | Cluster,
        @Inject('RedisPubSub') private readonly redisPubSubDatabase: Redis | Cluster,
    ) {
    }

    get isDbInitialised() {
        return this.db.isInitialized
    }

    get isDbAvailable() {
        return this.dbAvailable
    }

    set setDbAvailable(dbAvailable: boolean) {
        this.dbAvailable = dbAvailable
    }

    get db() {
        return this.defaultDatabase
    }

    public dbConnection() {
        return this.db.manager
    }

    public dbRepo<Entity>(target: EntityTarget<Entity>) {
        return this.dbConnection().getRepository(target)
    }

    get isRedisAvailable() {
        return this.redisAvailable
    }

    set setRedisAvailable(redisAvailable: boolean) {
        this.redisAvailable = redisAvailable
    }

    get redis() {
        return this.redisDatabase
    }

    get redisPubSub() {
        return this.redisPubSubDatabase
    }

    public logger() {
        return this.defaultLogger
    }
}
