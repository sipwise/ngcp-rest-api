import * as dotenv from "dotenv";

export const DATABASES = {
    accounting: {
        token: "db_accounting",
        name: "accounting",
    },
    billing: {
        token: "db_billing",
        name: "billing",
    },
};

export const DEVELOPMENT = 'development';
export const TEST = 'test';
export const PRODUCTION = 'production';
export const ADMIN_REPOSITORY = "ADMIN_REPOSITORY";
export const CONTACT_REPOSITORY = "CONTACT_REPOSITORY";

export const JOURNAL_SERVICE = "JOURNAL_SERVICE";
export const JOURNAL_REPOSITORY = "JOURNAL_REPOSITORY";
export const JOURNAL_V2_REPOSITORY = "JOURNAL_V2_REPOSITORY";
export const JOURNAL_OBJECT_REPOSITORY = "JOURNAL_OBJECT_REPOSITORY";

dotenv.config()

export const jwtConstants = {
    secret: process.env.JWTKEY,
};
