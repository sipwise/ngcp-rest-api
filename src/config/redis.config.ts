import {RedisOptions} from 'ioredis'

import {AppService} from '~/app.service'

const redis_host = process.env.API_REDIS_HOST || AppService.config.redis.host
const redis_port = process.env.API_REDIS_PORT || AppService.config.redis.port

export enum RedisDatabases {
    session = 19,
}

export const redisConfig: RedisOptions = {
    host: redis_host,
    port: +redis_port,
    keepAlive: 0,
    lazyConnect: true,
    retryStrategy: function (_) {
        return
    },
}
