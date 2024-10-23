import {Injectable} from '@nestjs/common'
import cluster from 'cluster'
import fs from 'fs'
import sdNotify from 'sd-notify'
import {AppService} from '~/app.service'
import {WinstonModule} from 'nest-winston'
import {winstonLoggerConfig} from '~/config/logger.config'
import {exit} from 'process'
import {LoggerService} from '~/logger/logger.service'

const workersAmount = AppService.config.common.workers

const pidDir = process.env.NODE_ENV == 'development'
    ? '/tmp/ngcp-rest-api'
    : '/run/ngcp-rest-api'
const pidFile = 'ngcp-rest-api.pid'
let started = 0
let workersOnline = 0

@Injectable()
export class AppClusterService {
    // TODO: Fix callback type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static clusterize(callback: Function): void {
        let logger: LoggerService
        try {
            logger = WinstonModule.createLogger(winstonLoggerConfig) as LoggerService
            if (cluster.isWorker) {
                logger.log(`Cluster worker PID: ${process.pid}`)
                callback()
            } else {
                logger.log(`Master server started with PID: ${process.pid} Workers: ${workersAmount}`)
                for (let i = 0; i < workersAmount; i++) {
                    cluster.fork()
                }
                cluster.on('exit', (worker, code, signal) => {
                    logger.log(`Worker ${worker.process.pid} died (${code} ${signal})`)
                    if (workersOnline > 0) {
                        workersOnline -= 1
                    }
                    if (!workersOnline) {
                        sdNotify.sendStatus('STOPPING=1')
                        if (fs.existsSync(`${pidDir}/${pidFile}`)) {
                            fs.unlinkSync(`${pidDir}/${pidFile}`)
                        }
                        logger.log('Server is stopped')
                        started = 0
                    }
                })
                cluster.on('disconnect', (_worker) => {
                    if (started) {
                        sdNotify.sendStatus('STOPPING=1')
                        if (fs.existsSync(`${pidDir}/${pidFile}`)) {
                            fs.unlinkSync(`${pidDir}/${pidFile}`)
                        }
                        logger.log('Server is stopped')
                        started = 0
                    }
                })
                cluster.on('listening', (worker) => {
                    logger.log(`Worker ${worker.process.pid} is ready`)
                    workersOnline += 1
                    if (!started && workersOnline == workersAmount) {
                        if (!fs.existsSync(pidDir)) {
                            fs.mkdirSync(pidDir, {recursive: true})
                        }
                        fs.writeFileSync(`${pidDir}/${pidFile}`, `${process.pid}\n`)
                        logger.log('Server is started')
                        sdNotify.sendStatus('READY=1')
                        sdNotify.ready()
                        started = 1
                    }
                })
            }
        }
        catch(e) {
            if (logger) {
                logger.error(e)
            } else {
                // eslint-disable-next-line no-console
                console.error(e)
            }
            sdNotify.sendStatus('STOPPING=1')
            started = 0
            exit(1)
        }
    }
}
