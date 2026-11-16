const {readFileSync} = require('fs')

const {load} = require('js-yaml')
const mysql = require('mysql2/promise')

// naive DB values are read in the process zone, so the e2e run needs TZ = the DB host's zone
module.exports = async () => {
    const config = load(readFileSync('./etc/api.conf', 'utf8')).database
    const connection = await mysql.createConnection({
        host: process.env.API_DB_HOST || config.host,
        port: +(process.env.API_DB_PORT || config.port),
        user: process.env.API_DB_USER || config.user,
        password: process.env.API_DB_PASS || config.pass,
        connectTimeout: 10000,
    })
    try {
        const [rows] = await connection.query('SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) AS utc_offset')
        const dbOffset = Number(rows[0].utc_offset)
        const nodeOffset = -new Date().getTimezoneOffset() * 60
        if (dbOffset != nodeOffset) {
            throw new Error(`the DB's UTC offset is ${dbOffset} s, this process' is ${nodeOffset} s `
                + `(TZ=${process.env.TZ ?? ''}): set TZ to the DB host's timezone, e.g. TZ=Europe/Vienna`)
        }
    } finally {
        await connection.end()
    }
}
