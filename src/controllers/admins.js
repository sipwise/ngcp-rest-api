const createError = require('http-errors');
const util = require('util');
const hal = require('../helpers/hal');

module.exports = function(app) {
    class Admins {
        static async list(req, res) {
            let page = await parseInt(req.query.page && req.query.page > 0 ? req.query.page : 1);
            let page_rows = await parseInt(req.query.rows && req.query.rows > 0 ? req.query.rows : 10);
            const rows = await app.db.billing.admins.findAll({
                raw: true,
                offset: page-1,
                limit: page_rows,
            });
            res.json(hal.json(req, res, 'admins', rows, page, page_rows));
        }

        static async get(req, res, next) {
            const row = await app.db.billing.admins.findByPk(req.params.id)
            if (!row) {
                next(createError(404));
            } else {
                res.json(hal.json(req, res, 'admins', row));
            }
        }

        static async create(req, res, next) {
            try {
                await app.db.billing.admins.create(req.body);
                res.json();
            } catch (e) {
                console.log("error: " + e);
                next(createError(500));
            }
        }
    }
    return Admins;
}
