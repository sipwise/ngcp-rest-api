import {readFileSync} from 'fs'
import {load} from 'js-yaml'

const configFile = readFileSync('/etc/ngcp-rest-api/api.conf', 'utf8')
const yaml = load(configFile)

export const config = yaml
