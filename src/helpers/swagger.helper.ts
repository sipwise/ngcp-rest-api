import {NestApplication} from '@nestjs/core'
import {DocumentBuilder, OpenAPIObject, ParameterObject, ReferenceObject, SwaggerModule} from '@nestjs/swagger'

import {SEARCH_QUERY_ORDER_KEY} from '~/decorators/api-search-query.decorator'
import swaggerTags from '~/localisation/en/swagger-tags.json'

// TODO: only en localisation for now as swagger cannot switch languages dynamically
export function createSwaggerDocument(app: NestApplication, api_prefix: string): void {
    const docBuilder = new DocumentBuilder()
    docBuilder
        .setTitle('Sipwise NGCP API Documentation')
    //.setDescription('NGCP API schema definition')
        .setVersion('2.0')
        .addBasicAuth()
        .addBearerAuth(undefined, 'JWT')
    /* TODO: consider if this needs to be enabled
    .addSecurity('cert', {
        type: 'http',
        scheme: 'cert',
    })
    */

    swaggerTags.forEach((tag: {name: string, description: string}) => {
        docBuilder.addTag(tag.name, tag.description)
    })

    if (!process.env.NODE_WP_BUNDLE) {
        app.useStaticAssets('./public/css',   {prefix: '/css'})
        app.useStaticAssets('./public/fonts', {prefix: '/fonts'})
    }

    const document = SwaggerModule.createDocument(app, docBuilder.build())
    sortSearchQueryParameters(document)
    SwaggerModule.setup(api_prefix, app, document, {
        customCss: ' \
            .swagger-ui .topbar { display: none } \
            .swagger-ui .info { margin-top: -1px; text-align: center; vertical-align: middle } \
            .swagger-ui .info .main { background: #54892b; height: 100px; } \
            .swagger-ui .info .main .title { color: #fff; padding: 29px } \
            * { font-family: "Titillium Web" } \
        ',

        customCssUrl: './' + (api_prefix.split('/')[1] ? api_prefix.split('/')[1]+'/' : '') + 'css/swagger-fonts.css',
        customSiteTitle: 'Sipwise NGCP API 2.0' ,
        swaggerOptions: {
            dom_id: '#swagger-ui',
            docExpansion: 'none',
            defaultModelsExpandDepth: -1,
            tagsSorter: 'alpha',
            tryItOutEnabled: true,
            supportedSubmitMethods: ['get', 'patch', 'put', 'post', 'delete', 'options', 'head'], // 'trace' is disabled
            onComplete: () => { // reset auth that might come with the browser
                this.ui.preauthorizeBasic('basicAuth', '123', '123')
                this.ui.preauthorizeApiKey('bearerAuth', '123')
            },
        },
        jsonDocumentUrl: api_prefix + '/swagger.json',
        yamlDocumentUrl: api_prefix + '/swagger.yaml',
    })
}

type OrderedParameter = (ParameterObject | ReferenceObject) & {[SEARCH_QUERY_ORDER_KEY]?: number}

function sortSearchQueryParameters(document: OpenAPIObject): void {
    const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
    const rank = (param: OrderedParameter): number => {
        if ('in' in param && param.in === 'path')
            return -1
        return param[SEARCH_QUERY_ORDER_KEY] ?? Number.MAX_SAFE_INTEGER
    }
    for (const pathItem of Object.values(document.paths)) {
        for (const method of methods) {
            const parameters = pathItem[method]?.parameters
            if (!parameters)
                continue
            parameters.sort((a, b) => rank(a) - rank(b))
            parameters.forEach((param: OrderedParameter) => delete param[SEARCH_QUERY_ORDER_KEY])
        }
    }
}
