import {NestApplication} from '@nestjs/core'
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import swaggerTags from '../localisation/en/swagger-tags.json'

// TODO: only en localisation for now as swagger cannot switch languages dynamically
export function createSwaggerDocument(app: NestApplication, api_prefix: string) {
    const docBuilder = new DocumentBuilder()
    docBuilder
    .setTitle('Sipwise NGCP API Documentation')
    //.setDescription('NGCP API schema definition')
    .setVersion('2.0')
    .addBasicAuth()
    .addBearerAuth(undefined, "JWT")
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
        app.useStaticAssets('./public/css',   { prefix: '/css' })
        app.useStaticAssets('./public/fonts', { prefix: '/fonts' })
    }

    const document = SwaggerModule.createDocument(app, docBuilder.build())
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
