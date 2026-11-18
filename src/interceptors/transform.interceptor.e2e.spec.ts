import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {
    HeaderRuleConditionExpression,
    HeaderRuleConditionMatchPart,
    HeaderRuleConditionMatchType,
    HeaderRuleConditionValueType,
} from '~/entities/internal/header-rule-condition.internal.entity'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ExpandInterceptor} from '~/interceptors/expand.interceptor'
import {LazyFieldInterceptor} from '~/interceptors/lazy-field.interceptor'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

const RESELLER_ID = 1
const HAL = 'application/hal+json'
const CONDITIONS_REL = 'ngcp:header-manipulations/sets/rules/conditions'

interface Link {
    href: string
}

interface HalItem {
    id?: number | string
    _links?: Record<string, Link | Link[]>
}

interface RouteLayer {
    route?: {
        path: string
        methods: Record<string, boolean>
    }
}

describe('HAL', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const worker = process.env.JEST_WORKER_ID
    const prefix = `e2e-hal-${worker}${Date.now()}`
    const username = `mockAdminUser${worker}`
    const password = 'mockAdminPass'
    let setId: number
    let ruleId: number
    let conditionId: number

    const get = (url: string): request.Test => request(app.getHttpServer())
        .get(url)
        .auth(username, password)
        .set('Accept', HAL)

    // GET routes reachable without ids: optional groups dropped, no parameters left
    const collectionPaths = (): string[] => {
        const stack = app.getHttpAdapter().getInstance().router.stack as RouteLayer[]
        const paths = stack
            .filter(layer => layer.route?.methods.get)
            .map(layer => layer.route.path.replace(/\{[^}]*\}/g, ''))
            .filter(path => !path.includes(':') && !path.includes('*'))
        return [...new Set(paths)]
    }

    const itemLinks = (body: {_links: Record<string, Link | Link[]>}, rel: string): Link[] => {
        const links = body._links[rel] ?? []
        return Array.isArray(links) ? links : [links]
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        app.useGlobalPipes(new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: true,
        }))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(
            new TransformInterceptor({
                pageName: AppService.config.common.api_default_query_page_name,
                perPageName: AppService.config.common.api_default_query_rows_name,
            }),
            new LoggingInterceptor(),
            new ClassSerializerInterceptor(app.get(Reflector)),
            app.get(LazyFieldInterceptor),
            new TransactionInterceptor(app.get(Reflector)),
            new ResponseValidationInterceptor(),
            app.get(ExpandInterceptor),
        )
        app.use(bodyParser.json({
            type: ['application/json-patch+json', 'application/json'],
        }))
        app.getHttpAdapter().getInstance().disable('x-powered-by')
        app.getHttpAdapter().getInstance().set('json spaces', 2)

        await app.init()

        await db.billing.Admin.delete({login: username})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        await db.billing.Admin.insert({
            reseller_id: RESELLER_ID,
            login: username,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: true,
            is_system: false,
            is_ccare: false,
            lawful_intercept: false,
            is_active: true,
            read_only: false,
            show_passwords: true,
            call_data: true,
            billing_data: true,
            can_reset_password: true,
            enable_2fa: false,
            show_otp_registration_info: false,
        })

        setId = (await db.provisioning.VoipHeaderRuleSet.insert({
            reseller_id: RESELLER_ID, name: prefix,
        })).identifiers[0].id as number
        ruleId = (await db.provisioning.VoipHeaderRule.insert({
            set_id: setId, name: prefix, priority: 100, direction: HeaderRuleDirection.AInbound, stopper: false, enabled: true,
        })).identifiers[0].id as number
        conditionId = (await db.provisioning.VoipHeaderRuleCondition.insert({
            rule_id: ruleId,
            match_type: HeaderRuleConditionMatchType.Header,
            match_part: HeaderRuleConditionMatchPart.Full,
            match_name: 'X-Hal',
            expression: HeaderRuleConditionExpression.Is,
            expression_negation: false,
            value_type: HeaderRuleConditionValueType.Input,
            enabled: true,
        })).identifiers[0].id as number
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    describe('', () => { // main tests block
        it('mock authService.compareBcryptPassword', async () => {
            jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
            expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
        })

        it('names the rel after the resource path without optional groups and parameters', async () => {
            for (const url of [
                `/api/header-manipulations/sets/${setId}/rules/${ruleId}/conditions`,
                `/api/header-manipulations/sets/rules/conditions?rule_id=${ruleId}`,
            ]) {
                const response = await get(url).expect(200)
                expect(Object.keys(response.body._embedded)).toEqual([CONDITIONS_REL])
            }
        })

        it('embeds items with their own self link, matching the item link list', async () => {
            const url = `/api/header-manipulations/sets/${setId}/rules/${ruleId}/conditions`
            const response = await get(url).expect(200)
            const self = {href: `${url}/${conditionId}`}
            expect(response.body._links[CONDITIONS_REL]).toEqual([self])
            expect(response.body._embedded[CONDITIONS_REL][0]._links).toEqual({self})
        })

        it('gives rows without an id neither an item link nor a self link', async () => {
            const response = await get('/api/pbx').expect(200)
            expect(response.body._links).not.toHaveProperty('ngcp:pbx')
            for (const item of response.body._embedded['ngcp:pbx'] as HalItem[])
                expect(item).not.toHaveProperty('_links')
        })

        it('links a single item to itself and its collection', async () => {
            const url = `/api/header-manipulations/sets/${setId}`
            const response = await get(url).expect(200)
            expect(response.body._links).toEqual({
                self: {href: url},
                collection: {href: '/api/header-manipulations/sets'},
            })
        })

        it('links a single response without an id to itself only', async () => {
            const url = `/api/header-manipulations/sets/${setId}`
            const response = await get(url).set('Prefer', 'return=id').expect(200)
            expect(response.body.ids).toEqual([setId])
            expect(response.body._links).toEqual({self: {href: url}})
        })

        it('keeps the HAL rules on every collection', async () => {
            const rows = AppService.config.common.api_default_query_rows_name
            const problems: string[] = []
            let checked = 0
            for (const path of collectionPaths()) {
                const response = await get(`${path}?${rows}=5`)
                if (response.status != 200 || !response.type.includes(HAL))
                    continue
                checked++
                for (const [rel, items] of Object.entries(response.body._embedded ?? {}) as [string, HalItem[]][]) {
                    if (!/^ngcp:[a-z0-9_-]+(\/[a-z0-9_-]+)*$/.test(rel))
                        problems.push(`${path}: invalid rel ${rel}`)
                    const selfLinks: Link[] = []
                    for (const item of items) {
                        if (item.id === undefined || item.id === null) {
                            if (item._links)
                                problems.push(`${path}: links on an item without id`)
                        } else if (item._links?.self) {
                            selfLinks.push(item._links.self as Link)
                        } else {
                            problems.push(`${path}: no self link on item ${item.id}`)
                        }
                    }
                    if (JSON.stringify(itemLinks(response.body, rel)) != JSON.stringify(selfLinks))
                        problems.push(`${path}: ${rel} links do not match the embedded self links`)
                }
            }
            expect(problems).toEqual([])
            expect(checked).toBeGreaterThan(20)
        })
    })

    describe('HAL DELETE', () => {
        it('delete fixtures', async () => {
            if (setId)
                await db.provisioning.VoipHeaderRuleSet.delete(setId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: username})
        })
    })
})
