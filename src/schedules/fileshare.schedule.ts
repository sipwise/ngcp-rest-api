import {Injectable} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'
import {LessThanOrEqual} from 'typeorm'
import {AppService} from '../app.service'
import {db} from '../entities'
import {LoggerService} from '../logger/logger.service'

@Injectable()
export class FileshareSchedule {
    private readonly log = new LoggerService(FileshareSchedule.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @Interval(5000)
    private async cleanupExpiredUploads() {
        if (!this.app.isDbInitialised || !this.app.isDbAvailable)
            return
        try {
            await db.fileshare.Upload.delete({
                expires_at: LessThanOrEqual(new Date()),
            })
        }
        catch (err) {
            this.log.error(`Could not cleanup expired fileshare uploads: ${err}`)
        }
    }
}
