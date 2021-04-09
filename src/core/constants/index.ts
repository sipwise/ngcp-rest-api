import * as dotenv from "dotenv";

export const SEQUELIZE = 'SEQUELIZE';
export const DEVELOPMENT = 'development';
export const TEST = 'test';
export const PRODUCTION = 'production';
export const ADMIN_REPOSITORY = "ADMIN_REPOSITORY";
export const CONTACT_REPOSITORY = "CONTACT_REPOSITORY";

dotenv.config()

export const jwtConstants = {
    secret: process.env.JWTKEY,
};