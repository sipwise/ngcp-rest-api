import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from "@nestjs/common";
import {Observable} from "rxjs";
import {map} from "rxjs/operators"
import * as halson from "halson";

interface TransformInterceptorOptions {
    pageName?: string;
    perPageName?: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    private readonly pageName: string;
    private readonly perPageName: string;

    constructor(options: TransformInterceptorOptions) {
        const { pageName = 'page', perPageName = 'row' } = options;
        this.pageName = pageName;
        this.perPageName = perPageName;
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const ctx = context.switchToHttp();
        return next.handle().pipe(map(data => {
            const req = ctx.getRequest();

            const accept = (req.headers.accept || '').split(',');
            if (accept.length == 1 && accept[0] === 'application/json') {
                return data;
            }
            let hal = this.generateHALResource(req, data)
            return hal;
        }))
    }

    private generateHALResource(req: any, data: any) {
        const page: string = (req.query[this.pageName] as string) ?? `${process.env.API_DEFAULT_QUERY_PAGE}`;
        const row: string = (req.query[this.perPageName] as string) ?? `${process.env.API_DEFAULT_QUERY_ROWS}`;

        const resName = TransformInterceptor.extractResourceName(req.url, process.env.API_PREFIX);

        const prefix = process.env.API_PREFIX;

        if (Array.isArray(data)) {
            let resource = halson()
                .addLink('self', `/${prefix}/${resName}?page=${page}&rows=${row}`);
            data.map(async (row) => {
                await resource.addLink(`ngcp:${resName}`, `/${prefix}/${resName}/${row.dataValues.id}`);
                await resource.addEmbed(`ngcp:${resName}`, row.dataValues);
            })
            resource.addLink('collection', `/${prefix}/${resName}`);
            resource['total_count'] = data.length

            return resource;
        }
        let resource = halson(data.dataValues)
            .addLink('self', `/${prefix}/${resName}/${data.dataValues.id}`)
            .addLink('collection', `/${prefix}/${resName}`);

        return resource;
    }

    private static extractResourceName(url: string, prefix: string): string {
        if (url.startsWith("/")) {
            url = url.slice(1)
        }
        if (url.startsWith(prefix)) {
            return url.slice(prefix.length + 1).split("/")[0]
        }
        return url.split("/")[0]
    }
}