import {ConnectionOptions} from 'typeorm'
import {db} from '../entities'
import {AppService} from '../app.service'

const db_user = process.env.API_DB_USER || AppService.config.database.user
const db_pass = process.env.API_DB_PASS || AppService.config.database.pass
const db_host = process.env.API_DB_HOST || AppService.config.database.host
const db_port = process.env.API_DB_PORT || AppService.config.database.port

const getDBEntries = () => {
    let entities = Array()
    Object.entries(db).forEach(([, e]) => {
        Object.entries(e).forEach(([, t]) => {
            entities.push(t)
        })
    })
    return entities
}
const entities = process.env.NODE_ENV == 'test' ? ['src/entities/db/**/*.ts'] : [...getDBEntries()]

export const databaseConfig: ConnectionOptions = {
    username: db_user,
    password: db_pass,
    port: db_port,
    host: db_host,
    type: 'mariadb',
    entities: entities,
    logging: ['info', 'error', 'query'],
}
