import * as dotenv from 'dotenv';

import {DatabaseConfigAttributes} from './interfaces/db-config.interface';
import {DATABASES} from "../constants";

dotenv.config();

export const databaseConfig: { [key: string]: DatabaseConfigAttributes} = {
    billing: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: DATABASES.billing.name,
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
    },
    accounting: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: DATABASES.accounting.name,
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
    },
};

