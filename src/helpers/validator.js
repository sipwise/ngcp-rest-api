const { check, checkSchema } = require('express-validator');
const createError = require('http-errors');

module.exports = {
    validate: async (req, res, next, schema) => {
        const chains = await checkSchema(schema);
        let errors = [];
        await Promise.all(chains.map(async (config) => {
            const validationResult = await config.run(req);
            if (validationResult.errors.length) {
                errors = errors.concat(validationResult.errors);
            }
        }));
        if (errors.length) {
            let err = createError(400);
            err.message = errors;
            next(err);
        } else {
            next();
        }
    }
}
