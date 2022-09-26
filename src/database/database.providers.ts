import {Logger} from '@nestjs/common'
import {DataSource} from 'typeorm'
import {databaseConfig} from '../config/database.config'

export const databaseProviders = [
    {
        provide: 'DB',
        useFactory: async () => {
            if (process.env.NODE_ENV == 'test')
                return;
            const log = new Logger('databaseProviders[DB]')
            const ds  = new DataSource(databaseConfig)
            try {
                await ds.initialize()
                log.debug('Connected to the database')
            } catch (err) {
                log.error({message: 'Could not connect to the database', err: err})
            }
            return ds
        },
    },
]
