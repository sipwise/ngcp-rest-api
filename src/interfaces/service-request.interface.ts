import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {Request} from 'express'

export interface ParamsDictionary {
    [key: string]: string
}

export class ServiceRequest {
    params: ParamsDictionary
    user: AuthResponseDto | any // TODO: fix typing
    headers: any
    query?: any
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
