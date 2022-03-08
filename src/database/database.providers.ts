import {Logger} from '@nestjs/common'
import {getConnectionManager} from 'typeorm'
import {databaseConfig} from '../config/database.config'

export const databaseProviders = process.env.NODE_ENV != 'test' ? [
    {
        provide: 'DB',

        useFactory: async () => {
            const log = new Logger('databaseProviders[DB]')
            const manager = getConnectionManager()
            manager.create(databaseConfig)
            try {
                await manager.get(databaseConfig.name).connect()
                log.debug('Connected to the database')
            } catch (err) {
                log.error({message: 'Could not connect to the database', err: err})
            }
            return manager
        },
    },
] : [{
    provide: 'DB', useFactory: async () => {
        return getConnectionManager()
    },
}]
