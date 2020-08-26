const { Sequelize } = require('sequelize');
const fs = require('fs');
const util = require('util');
const db_dir = './models/db';

module.exports = function(app) {
    const user = app.config.mariadb.username;
    const pass = app.config.mariadb.password;
    const host = app.config.mariadb.host;
    const port = app.config.mariadb.port;
    app.db = {};

/*
    try {
      app.db.authenticate();
      console.log(util.format('Connected to the DB %s:%d', host, port));
    } catch (error) {
      console.error('Unable to connect to the DB:', error);
      return;
    }
*/

    let schema = {};
    let scanDBSchema = (path) => {
        fs.readdirSync(path).forEach((file) => {
            let subpath = path + '/' + file;
            if (fs.lstatSync(subpath).isDirectory()) {
                scanDBSchema(subpath);
            } else {
                let dbName = path.split('/').pop();
                let tableName = file.substr(0, file.indexOf('.'));
                if (!tableName)
                    return;
                if (dbName in schema) {
                    schema[dbName].push(tableName);
                } else {
                    schema[dbName] = [ tableName ];
                }
            }
        });
    }
    scanDBSchema(db_dir);
    for (let dbName in schema) {
        let dbObj = new Sequelize(dbName, user, pass, {
            host: host,
            dialect: 'mariadb',
            benchmark: true,
            //logging: false,
            define: {
                charset: 'utf8mb4',
                timestamps: false,
                dialectOptions: {
                    collate: 'utf8mb4_general_ci',
                    useUTC: false
                },
            },
            pool: {
                min: 1,
                max: 100,
                idle: 10000,
                acquire: 60000
            },
            dialectOptions: {
                timezone: 'Etc/GMT0'
            },
            query: {
                raw: true
            }
        });

        for (let tableName of schema[dbName]) {
            require(util.format(".%s/%s/%s", db_dir, dbName, tableName))(app, dbName, tableName, dbObj, Sequelize);
        }
    }
}
