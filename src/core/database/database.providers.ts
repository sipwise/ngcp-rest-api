import {Sequelize} from 'sequelize-typescript';
import {Admin} from 'modules/admins/admin.entity';
import {Contact} from 'modules/contacts/contact.entity';

import {DATABASES} from '../constants';
import {databaseConfig} from './database.config';
import {Journal} from "../../modules/journal/journal.entity";

export const databaseProviders = [
    {
        provide: DATABASES.billing.token,
        useFactory: async () => {
            let config;
            config = databaseConfig["billing"]
            config['logging'] = true;
            config['query'] = {raw: true}; // TODO: figure out if raw or sequelize data is preferred
            const sequelize = new Sequelize(config);
            sequelize.addModels([Admin, Contact, Journal]);
            await sequelize.sync();
            return sequelize;
        },
    },
    {
        provide: DATABASES.accounting.token,
        useFactory: async () => {
            let config;
            config = databaseConfig["accounting"]
            config['logging'] = false;
            config['query'] = {raw: true}; // TODO: figure out if raw or sequelize data is preferred
            const sequelize = new Sequelize(config);
            // sequelize.addModels([JournalV2]);
            // await sequelize.sync();
            return sequelize;
        },
    }
];
