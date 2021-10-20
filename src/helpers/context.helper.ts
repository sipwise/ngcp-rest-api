import {Request} from 'express'
import {v4 as uuidv4} from 'uuid'

/**
 * Context allows to store additional data for a Request without modifying the request itself. This allows us to use
 * strong typing for Requests
 */
export default class Context {
    static _bindings = new WeakMap<Request, Context>()

    // public txid = uuidv4()
    public txid

    /**
     * Sets start time when Context is initialised in middleware
     */
    public startTime = Date.now()

    /**
     * Sets a uuid v4 value for transaction id txid
     */
    constructor() {
        let id: string = uuidv4()
        const re = new RegExp('-', 'g')
        this.txid = id.replace(re, '')
    }

    /**
     * Binds a request to a new Context
     * @param req
     */
    static bind(req: Request): void {
        const ctx = new Context()
        Context._bindings.set(req, ctx)
    }

    /**
     * Returns Context for given request
     * @param req
     */
    static get(req: Request): Context | null {
        {
            return Context._bindings.get(req) || null
        }
    }
}