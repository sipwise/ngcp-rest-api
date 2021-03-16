import { Sequelize } from 'sequelize-typescript';
import { Admin } from 'src/modules/admins/admin.entity';
import { Contact } from 'src/modules/contacts/contact.entity';

import { SEQUELIZE, DEVELOPMENT, TEST, PRODUCTION } from '../constants';
import { databaseConfig } from './database.config';


export const databaseProviders = [{
    provide: SEQUELIZE,
    useFactory: async () => {
        let config;
        switch (process.env.NODE_ENV) {
        case DEVELOPMENT:
           config = databaseConfig.development;
           break;
        case TEST:
           config = databaseConfig.test;
           break;
        case PRODUCTION:
           config = databaseConfig.production;
           break;
        default:
           config = databaseConfig.development;
        }
        config['logging'] = true;
        const sequelize = new Sequelize(config);
        sequelize.addModels([Admin, Contact]);
        await sequelize.sync();
        return sequelize;
    },
}];