
module.exports = function(app) {
    const admins = require('../controllers/admins')(app);
    const validate = require('../validators/admins');

    app.route(app.config.api_root + '/admins/')
        .get(admins.list)
        .post(validate.create, admins.create);

    app.route(app.config.api_root + '/admins/:id')
        .get(validate.get, admins.get);
}
