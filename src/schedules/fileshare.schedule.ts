import {Injectable, Logger} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'
import {LessThanOrEqual} from 'typeorm'
import {AppService} from '../app.service'
import {db} from '../entities'

@Injectable()
export class FileshareSchedule {
    private readonly log = new Logger(FileshareSchedule.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @Interval(5000)
    private async cleanupExpiredUploads() {
        if (!this.app.isDbInitialised || !this.app.isDbAvailable)
            return
        db.fileshare.Upload.delete({
            expires_at: LessThanOrEqual(new Date()),
        })
    }
}
