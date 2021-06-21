import {DATABASES} from '../config/constants.config'
import {config} from '../config/main.config'
import {SequelizeOptions} from 'sequelize-typescript'

export const databaseConfig: { [key: string]: SequelizeOptions } = {
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

