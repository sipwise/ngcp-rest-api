import {readFileSync} from 'fs'
import {basename} from 'path'
import {exit} from 'process'

import {plainToInstance} from 'class-transformer'
import {validateSync} from 'class-validator'
import {load} from 'js-yaml'

import {AppConfig} from './schemas/app.config.schema'

import {LoggerService} from '~/logger/logger.service'

const configFile = process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'test'
    ? './etc/api.conf'
    : '/etc/ngcp-rest-api/api.conf'

function loadConfig(): AppConfig {
    let yaml: unknown
    try {
        yaml = load(readFileSync(configFile, 'utf8'))
    } catch {
        const fileName = basename(configFile)
        new LoggerService('config')
            .error(`Cannot start the server, malformed configuration file '${fileName}'.`)
        exit(1)
    }

    const instance = plainToInstance(AppConfig, yaml)
    const errors = validateSync(instance, {forbidUnknownValues: false})
    if (errors.length > 0) {
        const fileName = basename(configFile)
        new LoggerService('config')
            .error(`Cannot start the server, invalid configuration file '${fileName}'.`)
        exit(1)
    }

    return instance
}

export const config = loadConfig()
