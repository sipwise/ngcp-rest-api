import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common'
import * as halson from 'halson'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {AppService} from '../app.sevice'
import {extractResourceName} from '../helpers/uri.helper'

/**
 * Defines the names of query parameters for pagination
 */
interface TransformInterceptorOptions {
    pageName?: string;
    perPageName?: string;
}

/**
 * TransformInterceptor transforms the data that is returned based on values set in the 'Accept' HTTP header.
 *
 * If the 'Accept' header explicitly contains 'application/json' that data is returned as is.
 * In all other cases the data is transformed into 'application/hal+json' before it is returned.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
    private readonly pageName: string
    private readonly perPageName: string

    /**
     * Creates a new TransformInterceptor with query parameter names set
     * @param options Query parameter names
     */
    constructor(options: TransformInterceptorOptions) {
        const {pageName = 'page', perPageName = 'row'} = options
        this.pageName = pageName
        this.perPageName = perPageName
    }

    /**
     * Transforms data that is returned to 'application/hal+json' depending on 'Accept' headers
     *
     * If content type explicitly is set to 'application/json' normal JSON is returned. In all other cases
     * JSON+HAL is returned.
     * @param context ExecutionContext to access HTTP request
     * @param next  Next CallHandler
     *
     * @returns data JSON or HAL+JSON
     */
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const ctx = context.switchToHttp()
        return next.handle().pipe(map(async data => {
            const req = ctx.getRequest()
            data = await data // TODO: Take a closer look. No idea why data is a promise in the first place
            const accept = (req.headers.accept || '').split(',')
            if (accept.length == 1 && accept[0] === 'application/json') {
                return data
            }
            if (req.method === 'DELETE') {
                return data
            }
            let hal = this.generateHALResource(req, data)
            return hal
        }))
    }

    /**
     * Generates HAL+JSON resource from request data
     * @param req HTTP request object
     * @param data Date to be transformed
     * @private
     */
    private generateHALResource(req: any, data: any) {
        const page: string = (req.query[this.pageName] as string) ?? `${AppService.config.common.api_default_query_page}`
        const row: string = (req.query[this.perPageName] as string) ?? `${AppService.config.common.api_default_query_rows}`

        const resName = extractResourceName(req.url, AppService.config.common.api_prefix)

        const prefix = AppService.config.common.api_prefix

        if (Array.isArray(data)) {
            let resource = halson()
                .addLink('self', `/${prefix}/${resName}?page=${page}&rows=${row}`)
            data.map(async (row) => {
                await resource.addLink(`ngcp:${resName}`, `/${prefix}/${resName}/${row.id}`)
                await resource.addEmbed(`ngcp:${resName}`, row)
            })
            resource.addLink('collection', `/${prefix}/${resName}`)
            resource['total_count'] = data.length

            return resource
        }
        let resource = halson(data)
            .addLink('self', `/${prefix}/${resName}/${data.id}`)
            .addLink('collection', `/${prefix}/${resName}`)

        return resource
    }


}
