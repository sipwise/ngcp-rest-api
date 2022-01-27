import {Injectable, Logger} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'
import {AppService} from '../app.service'

@Injectable()
export class DbStateSchedule {
    private readonly log = new Logger(DbStateSchedule.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @Interval(5000)
    private async checkDbAvailable() {
        if (!this.app.isDbInitialised) {
            try {
                await this.app.dbConnection().connect()
                if (this.app.isDbInitialised)
                    this.log.debug('Database is initialised')
            } catch {
            }
        } else {
            try {
                await this.app.dbConnection().manager.query('select 1')
                if (!this.app.isDbAvailable)
                    this.log.debug('Reconnected to the database')
                this.app.setDbAvailable = true
            } catch (err) {
                if (this.app.isDbAvailable)
                    this.log.debug('Lost connection to the database')
                this.app.setDbAvailable = false
            }
        }
    }
}
