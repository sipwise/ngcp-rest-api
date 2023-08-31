import {RedisModuleOptions} from '@nestjs-modules/ioredis'
import {AppService} from '../app.service'

const redis_host = process.env.API_REDIS_HOST || AppService.config.redis.host
const redis_port = process.env.API_REDIS_PORT || AppService.config.redis.port

export const redisConfig: RedisModuleOptions = {
    config: {
        url: `redis://${redis_host}:${redis_port}`,
        keepAlive: 60,
        retryStrategy: function (_) {
            return
        },
    },
}
