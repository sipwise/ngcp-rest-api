import {Injectable} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'
import {AppService} from '../app.service'
import {LoggerService} from '../logger/logger.service'

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
            let curStatus = this.app.redis.status
            if (curStatus == 'ready')
                return
            this.log.error('Trying to reconnect to redis')
            await this.app.redis.connect()
            await this.app.redisPubSub.connect()
            curStatus = this.app.redis.status
            this.app.setRedisAvailable = curStatus == 'ready'
            if (curStatus == 'ready')
                this.log.debug('Connected to Redis')
        } catch {
            this.app.setRedisAvailable = false
        }
    }
}
