import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators"
import * as halson from "halson";

interface TransformInterceptorOptions {
    resource: string;
    pageName?: string;
    perPageName?: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    private readonly resource: string;
    private readonly pageName: string;
    private readonly perPageName: string;

    constructor(options: TransformInterceptorOptions) {
        const {resource, pageName = 'page', perPageName = 'rows'} = options;
        this.resource = resource;
        this.pageName = pageName;
        this.perPageName = perPageName;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();

        return next.handle().pipe(map(data => {
            const req = ctx.getRequest();

            const accept = req.headers.accept.split(',');

            if (accept.includes('application/json')) {
                return data;
            }

            const page: string = (req.query[this.pageName] as string) ?? '1';
            const row: string = (req.query[this.perPageName] as string) ?? '10';

            let resource = halson()
                .addLink('self', `/${process.env.API_PREFIX}/${this.resource}?page=${page}&rows=${row}`);
            data.map(async (row) => {
                await resource.addLink(`ngcp:${this.resource}`, `/${process.env.API_PREFIX}/${this.resource}/${row.dataValues.id}`);
                await resource.addEmbed(`ngcp:${this.resource}`, row.dataValues);
            })
            resource.addLink('collection', `/${process.env.API_PREFIX}/${this.resource}`);

            const res = ctx.getResponse();
            res.setHeader("content-type", "application/hal+json");
            return resource;
        }))
    }
}