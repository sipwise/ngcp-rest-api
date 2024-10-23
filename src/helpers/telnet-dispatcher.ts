import {db} from '~/entities'

import {Telnet} from 'telnet-client'
import {LoggerService} from '~/logger/logger.service'

interface TelnetError {
    message: string
    host: string
    command: string
}

export class TelnetDispatcher {
    private readonly log = new LoggerService(TelnetDispatcher.name)

    async activateDomain(domain: string): Promise<TelnetError[]> {
        return await this.dispatchCommand('xmpp', domain, 'activate')
    }

    async deactivateDomain(domain: string): Promise<TelnetError[]> {
        return await this.dispatchCommand('xmpp', domain, 'deactivate')
    }

    private async dispatchCommand(target: string, domain: string, command: 'activate' | 'deactivate'): Promise<TelnetError[]> {
        const connection = new Telnet()
        const group = await db.provisioning.XmlGroup.findOne({where: {name: target}, relations: ['hosts']})
        const errors: TelnetError[] = []
        this.log.debug({message: 'dispatched telnet command', command: command, target: target, domain: domain})
        for (const host of group.hosts) {
            const params = {
                host: host.ip,
                port: host.port,
                shellPrompt: 'http://prosody.im/doc/console',
                timeout: 200,
            }

            try {
                await connection.connect(params)
                this.log.debug({
                    message: 'connection successful',
                    host: host.ip,
                    port: host.port,
                })
            } catch (error) {
                this.log.error({
                    message: 'connection timeout',
                    stack: error.stack,
                    host: host.ip,
                    port: host.port,
                    context: TelnetDispatcher.name,
                })
                errors.push({
                    command: command,
                    host: `${host.ip}:${host.port}${host.path}`,
                    message: 'connection error',
                })
                continue
            }
            const response = await connection.send(
                `host:${command}('${domain}')`,
                {
                    timeout: 200,
                },
            )
            if (response.match(/Result:\s*true/) !== null) {
                this.log.log({
                    message: `${command} domain`,
                    domain: domain,
                    success: true,
                })
            } else {
                this.log.error({
                    message: `${command}d domain`,
                    domain: domain,
                    success: false,
                    response: response,
                    context: TelnetDispatcher.name,
                })
                errors.push({
                    command: command,
                    host: `${host.ip}:${host.port}${host.path}`,
                    message: 'telnet command error',
                })
            }
            await connection.send('quit')
        }
        return errors
    }
}
