import {createConnection} from 'typeorm'
import {databaseConfig} from '../config/database.config'

export const databaseProviders = [
    {
        provide: 'DB',

        useFactory: async () => {
            return await createConnection(databaseConfig)
        },
    },
]
