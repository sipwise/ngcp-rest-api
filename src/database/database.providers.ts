import {createConnection} from 'typeorm'
import {databaseConfig} from '../config/database.config'
//import {LoggerService} from '../logger/logger.service'

export const databaseProviders = [
    {
        provide: 'DB',
        useFactory: async () => {
            return await createConnection(databaseConfig)
        },
    },
]
