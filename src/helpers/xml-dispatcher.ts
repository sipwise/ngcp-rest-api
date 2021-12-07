import {Logger} from '@nestjs/common'
import {db} from '../entities'
import {HttpRequest} from './http-request'
import {RequestOptions} from 'http'

export class XmlDispatcher {
    private readonly log = new Logger(XmlDispatcher.name)

    async dispatch(target: string, all: boolean, sync: boolean, body: string) {
        let group = await db.provisioning.XmlGroup.findOne({where: {name: target}, relations: ['hosts']})

        let request = new HttpRequest()
        for (let host of group.hosts) {
            this.log.log({
                message: 'dispatching xmlrpc request',
                target: target,
                all: all,
                sync: sync,
            })
            this.log.debug({message: 'xmlrpc request body', body: body})

            let options: RequestOptions = {
                host: host.ip,
                port: host.port,
                path: host.path,
                method: 'POST',
                headers: {
                    'User-Agent': 'Sipwise XML Dispatcher',
                    'Content-Type': 'text/xml',
                    'Content-Length': body.length,
                }
            }
            try {
                let res = await request.send(options, body)
                this.log.debug({message: 'response', response: res})
            } catch (error) {
                this.log.error({message: error.message}, error.stack, XmlDispatcher.name)
            }
        }
    }

    queuerunner() {

    }

    async sipDomainReload(domain: string) {
        const reloadCommand = `
<?xml version="1.0" ?>
<methodCall>
<methodName>domain.reload</methodName>
<params/>
</methodCall>`
        let response = this.dispatch("proxy-ng", true, true, reloadCommand)
        this.log.debug({message: 'response', response})
    }

    private queue() {

    }

    private dequeue() {

    }

    private unqueue() {

    }

}