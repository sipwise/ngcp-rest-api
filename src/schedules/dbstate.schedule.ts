import {Injectable} from '@nestjs/common'
import {Interval} from '@nestjs/schedule'
import {AppService} from '~/app.service'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class DbStateSchedule {
    private readonly log = new LoggerService(DbStateSchedule.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @Interval(5000)
    private async checkDbAvailable(): Promise<void> {
        if (!this.app.db.isInitialized) {
            try {
                await this.app.db.initialize()
                if (this.app.db.isInitialized)
                    this.log.debug('Database is initialised')
                this.app.setDbAvailable = true
            } catch {
                if (this.app.isDbAvailable)
                    this.log.debug('Could not initialise the database')
                this.app.setDbAvailable = false
            }
        } else {
            try {
                await this.app.dbConnection().query('select 1')
                if (!this.app.isDbAvailable)
                    this.log.debug('Reconnected to the database')
                this.app.setDbAvailable = true
            } catch {
                if (this.app.isDbAvailable)
                    this.log.debug('Lost connection to the database')
                this.app.setDbAvailable = false
            }
        }
    }
}
