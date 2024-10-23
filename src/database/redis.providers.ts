import {createRedisConnection} from '@nestjs-modules/ioredis'
import {redisConfig} from '../config/redis.config'
import {LoggerService} from '../logger/logger.service'
import {Redis, Cluster} from 'ioredis'

export const redisProviders = [
    {
        provide: 'Redis',
        useFactory: async (): Promise<Redis | Cluster> => {
            let redis: Redis | Cluster
            const log = new LoggerService('databaseProviders[Redis]')
            if (process.env.NODE_ENV == 'test' && process.env.NODE_TEST_E2E !== 'true') {
                log.debug('test environment detected, skip database connection')
                return redis
            }
            try {
                redis  = createRedisConnection(redisConfig)
                log.debug('Connected to Redis')
            } catch (err) {
                log.error(`Could not connect to Redis: ${err}`)
            }
            return redis
        },
    },
    {
        provide: 'RedisPubSub',
        useFactory: async (): Promise<Redis | Cluster> => {
            let redis: Redis | Cluster
            const log = new LoggerService('databaseProviders[RedisPubSub]')
            if (process.env.NODE_ENV == 'test' && process.env.NODE_TEST_E2E !== 'true') {
                log.debug('test environment detected, skip database connection')
                return redis
            }
            try {
                redis  = createRedisConnection(redisConfig)
                log.debug('Connected to Redis (PubSub)')
            } catch (err) {
                log.error(`Could not connect to Redis (PubSub): ${err}`)
            }
            return redis
        },
    },
]
