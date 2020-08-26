const validator = require('../helpers/validator');

module.exports = {
    create: async (req, res, next) => {
        await validator.validate(req, res, next, {
            login: {
                in: ['body'],
                isString: {
                    errorMessage: "String is expected"
                },
                exists: {
                    errorMessage: "Missing value"
                }
            },
        });
    },
    get: async (req, res, next) => {
        await validator.validate(req, res, next, {
            id: {
                in: ['params'],
                isInt: {
                    errorMessage: "Integer is expected"
                },
            },
        });
    },
}
