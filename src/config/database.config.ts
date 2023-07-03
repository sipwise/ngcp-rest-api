import {DataSourceOptions} from 'typeorm'
import {db} from '../entities'
import {AppService} from '../app.service'
import {TypeormLoggerService} from '../logger/typeorm-logger.service'

const db_user = process.env.API_DB_USER || AppService.config.database.user
const db_pass = process.env.API_DB_PASS || AppService.config.database.pass
const db_host = process.env.API_DB_HOST || AppService.config.database.host
const db_port = process.env.API_DB_PORT || AppService.config.database.port

const getDBEntries = () => {
    const entities = []
    Object.entries(db).forEach(([, e]) => {
        Object.entries(e).forEach(([, t]) => {
            entities.push(t)
        })
    })
    return entities
}

const entities = !process.env.NODE_WP_BUNDLE &&
                process.env.NODE_ENV == 'development' &&
                process.env.NODE_JEST !== 'true'
                    ? ['dist/entities/db/**/*.entity.js']
                    : [...getDBEntries()]

export const databaseConfig: DataSourceOptions = {
    name: 'default',
    username: db_user,
    password: db_pass,
    port: db_port,
    host: db_host,
    type: 'mariadb',
    entities: entities,
    connectTimeout: 10000,
    trace: false,
    debug: false,
    supportBigNumbers: true,
    logger: new TypeormLoggerService(['info', 'error']),
}
