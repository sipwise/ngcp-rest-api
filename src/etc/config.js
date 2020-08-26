// config.js
const config = {
    // TODO: separate dev and prod configs ?
    host: 'localhost',
    //port: '/run/apiserver.sock',
    port: '1441',
    api_root: '/api',
    mariadb:
    {
        username: 'root',
        password: '',
        host: '127.0.0.1',
        port: '3306'
    },
    mode: process.env.NODE_ENV ? process.env.NODE_ENV : 'prod'
}

module.exports = function(app) { app.config = config; }
