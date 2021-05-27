import {DatabaseConfigAttributes} from './interfaces/db-config.interface';
import {DATABASES} from '../constants';
import {config} from '../../config/main';

export const databaseConfig: { [key: string]: DatabaseConfigAttributes} = {
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
};

