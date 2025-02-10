import {IncomingHttpHeaders} from 'http'

import {Request} from 'express'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'

export interface ParamsDictionary {
    [key: string]: string
}

export interface QueriesDictionary {
    [key: string]: undefined | string | string[] | QueriesDictionary | QueriesDictionary[];
}

export class ServiceRequest {
    params: ParamsDictionary
    // TODO: Fix any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: AuthResponseDto | any
    headers: IncomingHttpHeaders | [undefined]
    query?: QueriesDictionary
    req: Request
    isInternalRedirect?: boolean
    returnContent: boolean
    // TODO: remove optional and adjust unit tests
    realm?: string | undefined = 'admin'
    remote_ip?: string | undefined = undefined

    constructor(req: Request) {
        this.params = req.params
        this.query = req.query
        this.headers = req.headers
        this.user = req.user
        this.req = req
        this.isInternalRedirect = req['isInternalRedirect']

        const prefer = req.headers.prefer || ''
        this.returnContent = prefer == 'return=representation'

        this.realm = req.header('x-auth-realm') ?? 'admin'
        this.remote_ip = req.header('x-real-ip') ?? req.ip
    }
}
