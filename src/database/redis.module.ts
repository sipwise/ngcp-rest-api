import {Inject, Module, OnModuleDestroy} from '@nestjs/common'
import {Redis} from 'ioredis'

import {redisProviders} from './redis.providers'

@Module({
    providers: [...redisProviders],
    exports: [...redisProviders],
})
export class RedisModule implements OnModuleDestroy {
    constructor(
        @Inject('Redis') private readonly redis: Redis,
        @Inject('RedisPubSub') private readonly redisPubSub: Redis,
    ) {}

    // the clients are not created in unit tests
    onModuleDestroy(): void {
        this.redis?.disconnect()
        this.redisPubSub?.disconnect()
    }
}
