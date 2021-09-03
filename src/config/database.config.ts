import {ConnectionOptions} from 'typeorm'
import {AppService} from '../app.sevice'

const db_user = process.env.API_DB_USER || AppService.config.database.user
const db_pass = process.env.API_DB_PASS || AppService.config.database.pass
const db_host = process.env.API_DB_HOST || AppService.config.database.host
const db_port = process.env.API_DB_PORT || AppService.config.database.port

export const databaseConfig: ConnectionOptions = {
    username: db_user,
    password: db_pass,
    port: db_port,
    host: db_host,
    type: "mariadb",
    entities: [
        "dist/entities/db/**/*.js",
        "prod/entities/db/**/*.js"
    ],
    logging: ["info", "error", "query"]
}
