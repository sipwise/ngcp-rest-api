import {readFileSync} from 'fs'
import {load} from 'js-yaml'

const configFile = process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'test'
    ? './etc/api.conf'
    : '/etc/ngcp-rest-api/api.conf'
const yaml = load(readFileSync(configFile, 'utf8'))

export const config = yaml
