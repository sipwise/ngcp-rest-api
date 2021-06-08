import {DatabaseConfigAttributes} from '../interfaces/db-config.interface'
import {DATABASES} from '../config/constants.config'
import {config} from '../config/main.config'

export const databaseConfig: { [key: string]: DatabaseConfigAttributes } = {
    billing: {
        username: config.database.user,
        password: config.database.pass,
        database: DATABASES.billing.name,
        host: config.database.host,
        dialect: config.database.dialect,
    },
    accounting: {
        username: config.database.user,
        password: config.database.pass,
        database: DATABASES.accounting.name,
        host: config.database.host,
        dialect: config.database.dialect,
    },
}

