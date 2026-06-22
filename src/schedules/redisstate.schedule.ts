import {Injectable} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'

import {AppService} from '~/app.service'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RedisStateSchedule {
    private readonly log = new LoggerService(RedisStateSchedule.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @Interval(5000)
    private async checkRedisAvailable(): Promise<void> {
        try {
            const curStatus = this.app.redis.status
            if (curStatus == 'ready')
                await this.app.redis.ping()
        } catch {
            this.app.setRedisAvailable = false
        }
        try {
            const curStatus = this.app.redisPubSub.status
            if (curStatus == 'ready')
                await this.app.redisPubSub.ping()
        } catch {
            this.app.setRedisAvailable = false
        }
        // main connection
        try {
            let curStatus = this.app.redis.status
            if (curStatus != 'ready') {
                this.log.error(`Trying to reconnect to redis (status: ${curStatus}`)
                await this.app.redis.connect()
                curStatus = this.app.redis.status
                this.app.setRedisAvailable = curStatus == 'ready'
                if (curStatus == 'ready')
                    this.log.debug('Connected to Redis')
            }
        } catch {
            this.app.setRedisAvailable = false
            return
        }

        // pubSub
        try {
            let curStatus = this.app.redisPubSub.status
            if (curStatus != 'ready') {
                this.log.error(`Trying to reconnect to redis PubSub (status: ${curStatus}`)
                await this.app.redisPubSub.connect()
                curStatus = this.app.redisPubSub.status
                this.app.setRedisAvailable = curStatus == 'ready'
                if (curStatus == 'ready')
                    this.log.debug('Connected to Redis PubSub')
            }
        } catch {
            this.app.setRedisAvailable = false
        }
    }
}
