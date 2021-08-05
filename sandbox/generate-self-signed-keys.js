#!/usr/bin/env node

const fs = require('fs')
const args = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 --destdir ./etc/ssh')
    .demandOption('destdir')
    .argv

const selfsigned = require('selfsigned')

const keyName = 'myserver'
const days = 30
const attrs = [{
    name: 'commonName',
    value: 'ngcp-rest-api dev mode',
}]

const extMap = {
    private: 'key',
    public: 'csr',
    cert: 'crt',
}

console.log('Generating "%s" ssl keys: days=%d, attrs=%j', keyName, days, attrs)

const pems = selfsigned.generate(attrs, {
    keySize: 4096,
    days: 30,
})

for (const key in pems) {
    let ext = extMap[key]
    if (ext == null)
        continue
    let keyFile = `${args.destdir}/${keyName}.${ext}`
    fs.mkdirSync(args.destdir, { recursive: true })
    console.log("Writing:", keyFile)
    fs.writeFileSync(keyFile, pems[key])
}

process.exit(0)
