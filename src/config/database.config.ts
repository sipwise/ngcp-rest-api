import {DATABASES} from '../config/constants.config'
import {config} from '../config/main.config'
import {SequelizeOptions} from 'sequelize-typescript'

const db_user = process.env.API_DB_USER || config.database.user
const db_pass = process.env.API_DB_PASS || config.database.pass
const db_host = process.env.API_DB_HOST || config.database.host

export const databaseConfig: { [key: string]: SequelizeOptions } = {
    billing: {
        username: db_user,
        password: db_pass,
        database: DATABASES.billing.name,
        host: db_host,
        dialect: config.database.dialect,
    },
    accounting: {
        username: db_user,
        password: db_pass,
        database: DATABASES.accounting.name,
        host: db_host,
        dialect: config.database.dialect,
    },
}

