import {RedisSingleOptions} from '@nestjs-modules/ioredis'

import {AppService} from '~/app.service'

const redis_host = process.env.API_REDIS_HOST || AppService.config.redis.host
const redis_port = process.env.API_REDIS_PORT || AppService.config.redis.port

export enum RedisDatabases {
    session = 19,
}

export const redisConfig: RedisSingleOptions = {
    type: 'single',
    url: `redis://${redis_host}:${redis_port}`,
    options: {
        keepAlive: 60,
        retryStrategy: function (_) {
            return
        },
    },
}
