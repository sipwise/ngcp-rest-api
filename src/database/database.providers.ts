import {Sequelize, SequelizeOptions} from 'sequelize-typescript'
import * as mysql2 from 'mysql2'
import {DATABASES} from '../config/constants.config'
import {databaseConfig} from '../config/database.config'
import {Admin} from '../entities/db/billing/admin.entity'
import {Contact} from '../entities/db/billing/contact.entity'
import {Journal} from '../entities/db/billing/journal.entity'
import {LoggerService} from '../logger/logger.service'
import {Domain} from '../entities/db/billing/domain.entity'

const logger = new LoggerService()

export const databaseProviders = [
    {
        provide: DATABASES.billing.token,
        useFactory: async () => {
            let config = databaseConfig['billing']
            config.logging = (msg) => logger.log(msg)
            if (config.dialect === 'mysql') {
                config.dialectModule = mysql2 // workaround for webpack (please install mysql2 module)
            }

            // TODO: figure out if raw or sequelize data is preferred
            //       When raw == false class-transformer classToPlain sometime runs into "Maximum call stack size exceeded"
            config.query = {raw: false}
            const sequelize = new Sequelize(config)
            sequelize.addModels([Admin, Contact, Journal, Domain])
            await sequelize.sync()
            return sequelize
        },
    },
    {
        provide: DATABASES.accounting.token,
        useFactory: async () => {
            let config
            config = databaseConfig['accounting']
            config.logging = (msg) => logger.log(msg)
            if (config.dialect === 'mysql') {
                config.dialectModule = mysql2 // workaround for webpack (please install mysql2 module)
            }
            config.query = {raw: false} // TODO: figure out if raw or sequelize data is preferred
            const sequelize = new Sequelize(config)
            // sequelize.addModels([JournalV2]);
            // await sequelize.sync();
            return sequelize
        },
    },
]
