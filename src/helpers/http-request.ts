import {ClientRequest} from 'http'
import http = require('http')
import {LoggerService} from '../logger/logger.service'

export class HttpRequest {
    private readonly log = new LoggerService(HttpRequest.name)

    public async send(options: http.RequestOptions, data?: any): Promise<any> {

        let result = ''
        return new Promise((resolve, reject) => {
            this.log.debug({message: 'starting http request', options: options})
            const req: ClientRequest = http.request(options, (res) => {

                this.log.debug({message: 'response', statusCode: res.statusCode, headers: res.headers})

                res.on('data', chunk => {
                    result += chunk
                })

                res.on('error', err => {
                    this.log.error(err)
                    reject(err)
                })

                res.on('end', () => {
                    try {
                        const body = result
                        resolve(body)
                    } catch (err) {
                        this.log.debug({message: 'error in response end', err: err})
                        reject(err)
                    }
                })
            })

            /***
             * handles the errors on the request
             */
            req.on('error', (err) => {
                this.log.error({message: err.message, stack: err.stack})
                reject(err)
            })

            /***
             * handles the timeout error
             */
            req.on('timeout', (err) => {
                this.log.debug({message: 'timeout', err})
                req.abort()
            })

            /***
             * unhandle errors on the request
             */
            req.on('uncaughtException', (err) => {
                this.log.debug({message: 'uncaughtException', err})
                req.abort()
            })

            /**
             * adds the payload/body
             */
            if (data) {
                // const body = JSON.stringify(data)
                this.log.debug({message: 'writing body', body: data})
                req.removeHeader('Transfer-Encoding')
                req.write(data)
            }

            /**
             * end the request to prevent ECONNRESET and socket hung errors
             */
            req.end(() => {
                this.log.debug({message: 'request ends'})
            })

        })
    }
}
