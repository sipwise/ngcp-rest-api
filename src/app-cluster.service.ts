import {Injectable} from '@nestjs/common'
import * as cluster from 'cluster'
import * as fs from 'fs'
import * as sdNotify from 'sd-notify'
import {LoggerService} from './logger/logger.service'
import {AppService} from './app.service'

const workersAmount = AppService.config.common.workers

const pidDir = process.env.NODE_ENV == 'development'
    ? '/tmp/ngcp-rest-api'
    : '/run/ngcp-rest-api'
const pidFile = 'ngcp-rest-api.pid'
var started = 0
var workersOnline = 0

@Injectable()
export class AppClusterService {
    static clusterize(callback: Function): void {
        const logger = new LoggerService()
        if (cluster.isMaster) {
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
            cluster.on('disconnect', (worker) => {
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
                        fs.mkdir(pidDir, {recursive: true}, (err) => {
                            logger.log(err)
                        })
                    }
                    fs.writeFileSync(`${pidDir}/${pidFile}`, `${process.pid}\n`)
                    logger.log('Server is started')
                    sdNotify.sendStatus('READY=1')
                    sdNotify.ready()
                    started = 1
                }
            })
        } else {
            logger.log(`Cluster worker PID: ${process.pid}`)
            callback()
        }
    }
}
