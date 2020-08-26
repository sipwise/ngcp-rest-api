'use strict';

// init
process.chdir('src');

const express = require('express');
const pretty = require('express-prettify');
const createError = require('http-errors');
const bodyParser = require('body-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

const app = express();
const auth = require('./helpers/auth');
const config = require('./etc/config')(app);
const db = require('./models/db')(app);

app.set('trust proxy', true);
app.use(logger('combined'));
app.use(pretty({ always: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// TODO: make cors and helmet on/off in the config
//app.use(cors());
//app.use(helmet());
app.use(auth(app)); // TODO: move to controllers/root ?

const routes_dir = './routes';
fs.readdirSync(routes_dir).forEach((file) => {
    if (file.match(/\.js$/)) {
        let name = file.substr(0, file.indexOf('.'));
        require(routes_dir + '/' + name)(app);
    }
});

// error handling
app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({ code: err.status, message: err.message});
});

module.exports = app;
