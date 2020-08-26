
module.exports = function(app) {
    const domains = require('../controllers/domains')(app);
    const validate = require('../validators/domains');

    app.route(app.config.api_root + '/domains/')
        .get(domains.list)
        .post(validate.create, domains.create);

    app.route(app.config.api_root + '/domains/:id')
        .get(validate.get, domains.get);
}
