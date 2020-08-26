const bcrypt = require('bcrypt');
const createError = require('http-errors');
const util = require('util');

module.exports = function(app) {
    return async (req, res, next) => {
        if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
            await authError(next);
            return;
        }
        const b64auth = (req.headers.authorization).split(' ')[1];
        const [ login, password ] = Buffer.from(b64auth, 'base64').toString().split(':');

        const admin = await app.db.billing.admins.findOne({
            where: { login: login }
        });

        if (!admin) {
            await authError(next);
            return;
        }

        const [ b64salt, b64hash ] = admin.saltedpass.split('$');
        const bcrypt_version = '2b'; // TODO: move to config ?
        const bcrypt_cost = 13;

        await bcrypt.compare(await password, util.format('$%s$%d$%s%s', await bcrypt_version, await bcrypt_cost, await b64salt, await b64hash)).then((result) => {
            if (!result) {
                authError(next);
                return;
            }
        });

        next();
    }
}

function authError(next) {
    let err = createError(401);
    err.message = 'Authorization required.';
    next(err);
}
