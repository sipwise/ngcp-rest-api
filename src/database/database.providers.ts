import {DataSource} from 'typeorm'
import {StorageDriver, addTransactionalDataSource, initializeTransactionalContext} from 'typeorm-transactional'

import {databaseConfig} from '~/config/database.config'
import {LoggerService} from '~/logger/logger.service'

export const databaseProviders = [
    {
        provide: 'DB',
        useFactory: async (): Promise<DataSource> => {
            const log = new LoggerService('databaseProviders[DB]')
            const ds  = new DataSource(databaseConfig)
            // the default cls-hooked driver installs a process-wide async hook that is never removed
            initializeTransactionalContext({storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE})
            if (process.env.NODE_ENV == 'test' && process.env.NODE_TEST_E2E !== 'true') {
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
