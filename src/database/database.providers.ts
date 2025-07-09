import {DataSource} from 'typeorm'
import {initializeTransactionalContext} from 'typeorm-transactional'
import {addTransactionalDataSource} from 'typeorm-transactional'

import {databaseConfig} from '~/config/database.config'
import {LoggerService} from '~/logger/logger.service'

export const databaseProviders = [
    {
        provide: 'DB',
        useFactory: async (): Promise<DataSource> => {
            const log = new LoggerService('databaseProviders[DB]')
            const ds  = new DataSource(databaseConfig)
            initializeTransactionalContext()
            if (process.env.NODE_ENV == 'test' && process.env.NODE_TEST_E2E !== 'true') {
                log.debug('test environment detected, skip database connection')
                return ds
            }
            try {
                await ds.initialize()
                log.debug('Connected to the database')
            } catch (err) {
                log.error(`Could not connect to the database: ${err}`)
            }
            addTransactionalDataSource(ds)
            return ds
        },
    },
]
