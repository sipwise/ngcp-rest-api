import {readFileSync} from 'fs'

import {plainToInstance} from 'class-transformer'
import {validateOrReject} from 'class-validator'
import {load} from 'js-yaml'

import {AppConfig} from './schemas/app.config.schema'

const configFile = process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'test'
    ? './etc/api.conf'
    : '/etc/ngcp-rest-api/api.conf'

const yaml = load(readFileSync(configFile, 'utf8'))

const configInstance = plainToInstance(AppConfig, yaml)

validateOrReject(configInstance)
    .catch(errors => {
        throw new Error(`Configuration validation error: ${JSON.stringify(errors)}`)
    })

export const config = configInstance
