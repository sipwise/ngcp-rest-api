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
    // TODO: Does this change make sense? Is it breaking anything?
    headers: IncomingHttpHeaders | [undefined]
    // TODO: Does this change make sense? Is it breaking anything? Changed from any to QueriesDictionary
    query?: QueriesDictionary
    req: Request
    returnContent: boolean

    constructor(req: Request) {
        this.params = req.params
        this.query = req.query
        this.headers = req.headers
        this.user = req.user
        this.req = req

        const prefer = req.headers.prefer || ''
        this.returnContent = prefer == 'return=representation'
    }
}
