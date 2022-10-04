import {DataSource} from 'typeorm'
import {databaseConfig} from '../config/database.config'
import {LoggerService} from '../logger/logger.service'

export const databaseProviders = [
    {
        provide: 'DB',
        useFactory: async () => {
            if (process.env.NODE_ENV == 'test')
                return;
            const log = new LoggerService('databaseProviders[DB]')
            const ds  = new DataSource(databaseConfig)
            try {
                await ds.initialize()
                log.debug('Connected to the database')
            } catch (err) {
                log.error(`Could not connect to the database: ${err}`)
            }
            return ds
        },
    },
]
