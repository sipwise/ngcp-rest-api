import halson from 'halson'
import {AppService} from '../app.service'
import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'

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
        const {pageName = 'page', perPageName = 'rows'} = options
        this.pageName = pageName
        this.perPageName = perPageName
    }

    /**
     * Transforms data that is returned to 'application/hal+json' depending on 'Accept' headers
     *
     * If content type explicitly is set to 'application/json' normal JSON is returned. In all other cases
     * JSON+HAL is returned.
     *
     * header prefer determines whether content is sent back or not
     *
     * @param context ExecutionContext to access HTTP request
     * @param next  Next CallHandler
     *
     * @returns data JSON or HAL+JSON
     */
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const ctx = context.switchToHttp()
        return next.handle().pipe(map(data => {
            const req = ctx.getRequest()
            const res = ctx.getResponse()

            /**
             * if prefer header is empty we return 204 no content on all methods except POST and GET
             * if return=minimal we return 204 on all http methods
             * else we return content
             */
            const prefer = req.headers.prefer || ''
            switch (prefer) {
            case 'return=minimal':
                res.status(204)
                return
            case 'return=representation':
                break
            default:
                if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                    res.status(204)
                    return
                }
                break
            }

            const accept = (req.headers.accept || '').split(',')
            if (res.passthrough) {
                return data
            }
            if (accept.length == 1 && accept[0] === 'application/json') {
                if (Array.isArray(data) && data.length == 2 && Number(data[data.length - 1]))
                    return {data: data[0], total_count: data[1]}
                return data
            }
            if (req.method === 'DELETE') {
                return data
            }

            res.setHeader('content-type', 'application/hal+json')

            return this.generateHALResource(req, data)
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
        const rows: string = (req.query[this.perPageName] as string) ?? `${AppService.config.common.api_default_query_rows}`

        const re = /^\/api\/(\S+?)(\/.*)?$/
        const path: string = req.route.path
        const resName = path.match(re)[1]

        let resource

        if (Array.isArray(data)) {
            let totalCount: number = data.length
            if (data.length == 2 && Array.isArray(data[0]) && !isNaN(data[1])) {
                totalCount = data.pop()
                data = data.pop()
            }
            resource = halson()
                .addLink('self', req.originalUrl)
            data.map(async (row) => {
                if (data.length == 1) {
                    await resource.addLink(`ngcp:${resName}`, [{href: `${path}/${row.id}`}])
                } else {
                    await resource.addLink(`ngcp:${resName}`, `${path}/${row.id}`)
                }
                await resource.addEmbed(`ngcp:${resName}`, [row])
            })
            resource.addLink('collection', req.route.path)
            resource['total_count'] = totalCount

            const pageCount = Math.ceil(totalCount / +rows)
            if (+page > 1) {
                resource.addLink('prev', `${req.route.path}?page=${+page - 1}&rows=${rows}`)
            }
            if (+page < pageCount) {
                resource.addLink('next', `${req.route.path}?page=${+page + 1}&rows=${rows}`)
            }
            return resource
        } else if (data && 'id' in data) {
            resource = halson(data)
                .addLink('self', `/api/${resName}/${data.id}`)
                .addLink('collection', `/api/${resName}`)
        }
        return resource
    }

}
