import {Module} from '@nestjs/common'
import {redisProviders} from '~/database/redis.providers'

@Module({
    providers: [...redisProviders],
    exports: [...redisProviders],
})
export class RedisModule {
}
