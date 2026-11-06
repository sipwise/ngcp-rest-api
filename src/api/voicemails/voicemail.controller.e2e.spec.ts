import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {VoicemailModule} from './voicemail.module'
import {VoicemailService} from './voicemail.service'

import {VoicemailResponseDto} from '~/api/voicemails/dto/voicemail-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {voicemailSpoolDir} from '~/enums/supported-voicemail-folders.enum'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Voicemail', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const createdVoicemailIds: number[] = []
    const domain = `e2e-vm-${Date.now().toString(36)}.example.org`
    let billingDomainId: number
    let provisioningDomainId: number
    let contractId: number
    let provisioningSubscriberId: number
    let mailboxUuid: string
    const otherResellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const reseller1Creds = {username: `mockReseller1User${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    let otherResellerContractId: number
    let otherResellerId: number
    let otherResellerHeader: [string, string]
    let reseller1Header: [string, string]

    const insertResellerAdmin = async (login: string, resellerId: number): Promise<void> => {
        await db.billing.Admin.delete({login: login})
        const resellerRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.reseller})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: resellerRole.id,
            is_master: true,
            is_superuser: false,
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
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [VoicemailModule, AppModule],
        })
            .compile()

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
            new TransactionInterceptor(app.get(Reflector)),
            new ResponseValidationInterceptor(),
        )
        app.use(bodyParser.json({
            type: ['application/json-patch+json', 'application/json'],
        }))
        app.getHttpAdapter().getInstance().disable('x-powered-by')
        app.getHttpAdapter().getInstance().set('json spaces', 2)

        await app.init()

        await db.billing.Admin.delete({login: creds.username})
        const adminRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        await db.billing.Admin.insert({
            reseller_id: 1,
            login: creds.username,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: adminRole.id,
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

        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id
        contractId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
        const uuid = uuidv4()
        await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
            contract_id: contractId,
            uuid: uuid,
            username: 'e2e_vm',
            domain_id: billingDomainId,
            status: 'active',
        })
        provisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
            username: 'e2e_vm',
            domain_id: provisioningDomainId,
            uuid: uuid,
            password: uuidv4().slice(0, 16),
            account_id: contractId,
        })).identifiers[0].id
        // the spool rows reference the mailbox (no entity for kamailio.voicemail_users)
        await appService.db.query('INSERT INTO kamailio.voicemail_users (customer_id, mailbox) VALUES (?, ?)', [uuid, 'e2e_vm'])
        mailboxUuid = uuid

        const voicemailSpools = [
            {msgnum: 1, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807094', duration: '173', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807094-00000073', call_id: '76d762ae_pbx-1'},
            {msgnum: 2, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807100', duration: '160', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807100-00000074', call_id: '76d762ae_pbx-2'},
            {msgnum: 3, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807105', duration: '145', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807105-00000075', call_id: '76d762ae_pbx-3'},
            {msgnum: 4, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807110', duration: '130', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807110-00000076', call_id: '76d762ae_pbx-4'},
            {msgnum: 5, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807115', duration: '140', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807115-00000077', call_id: '76d762ae_pbx-5'},
            {msgnum: 6, dir: '/var/spool/asterisk/voicemail/default/Cust2/Cust2', context: 'voicemailcaller_unavail', origtime: '1594807120', duration: '155', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807120-00000078', call_id: '76d762ae_pbx-6'},
            {msgnum: 7, dir: '/var/spool/asterisk/voicemail/default/Cust3/Cust3', context: 'voicemailcaller_unavail', origtime: '1594807125', duration: '135', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807125-00000079', call_id: '76d762ae_pbx-7'},
            {msgnum: 8, dir: '/var/spool/asterisk/voicemail/default/Cust4/Cust4', context: 'voicemailcaller_unavail', origtime: '1594807130', duration: '145', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807130-00000080', call_id: '76d762ae_pbx-8'},
            {msgnum: 9, dir: '/var/spool/asterisk/voicemail/default/Cust5/Cust5', context: 'voicemailcaller_unavail', origtime: '1594807135', duration: '150', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807135-00000081', call_id: '76d762ae_pbx-9'},
            {msgnum: 10, dir: '/var/spool/asterisk/voicemail/default/Cust6/Cust6', context: 'voicemailcaller_unavail', origtime: '1594807140', duration: '160', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807140-00000082', call_id: '76d762ae_pbx-10'},
            {msgnum: 11, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807145', duration: '170', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807145-00000083', call_id: '76d762ae_pbx-11'},
            {msgnum: 12, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807150', duration: '150', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807150-00000084', call_id: '76d762ae_pbx-12'},
            {msgnum: 13, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807155', duration: '130', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807155-00000085', call_id: '76d762ae_pbx-13'},
            {msgnum: 14, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807160', duration: '140', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807160-00000086', call_id: '76d762ae_pbx-14'},
            {msgnum: 15, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807165', duration: '155', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807165-00000087', call_id: '76d762ae_pbx-15'},
            {msgnum: 16, dir: '/var/spool/asterisk/voicemail/default/Cust2/Cust2', context: 'voicemailcaller_unavail', origtime: '1594807170', duration: '160', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807170-00000088', call_id: '76d762ae_pbx-16'},
            {msgnum: 17, dir: '/var/spool/asterisk/voicemail/default/Cust3/Cust3', context: 'voicemailcaller_unavail', origtime: '1594807175', duration: '170', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807175-00000089', call_id: '76d762ae_pbx-17'},
            {msgnum: 18, dir: '/var/spool/asterisk/voicemail/default/Cust4/Cust4', context: 'voicemailcaller_unavail', origtime: '1594807180', duration: '160', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807180-00000090', call_id: '76d762ae_pbx-18'},
            {msgnum: 19, dir: '/var/spool/asterisk/voicemail/default/Cust5/Cust5', context: 'voicemailcaller_unavail', origtime: '1594807185', duration: '150', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807185-00000091', call_id: '76d762ae_pbx-19'},
            {msgnum: 20, dir: '/var/spool/asterisk/voicemail/default/Cust6/Cust6', context: 'voicemailcaller_unavail', origtime: '1594807190', duration: '155', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807190-00000092', call_id: '76d762ae_pbx-20'},
            {msgnum: 21, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807195', duration: '165', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807195-00000093', call_id: '76d762ae_pbx-21'},
            {msgnum: 22, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807200', duration: '150', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807200-00000094', call_id: '76d762ae_pbx-22'},
            {msgnum: 23, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807205', duration: '140', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807205-00000095', call_id: '76d762ae_pbx-23'},
            {msgnum: 24, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807210', duration: '130', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807210-00000096', call_id: '76d762ae_pbx-24'},
            {msgnum: 25, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807215', duration: '145', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807215-00000097', call_id: '76d762ae_pbx-25'},
            {msgnum: 26, dir: '/var/spool/asterisk/voicemail/default/Cust1/INBOX', context: 'voicemailcaller_unavail', origtime: '1594807215', duration: '145', mailboxuser: uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807215-00000097', call_id: '76d762ae_pbx-25'},
        ]

        const voicemailSpoolObjects = voicemailSpools.map(data => {
            const voicemailSpool = db.kamailio.VoicemailSpool.create({
                msgnum: data.msgnum,
                dir: data.dir,
                context: data.context,
                mailboxcontext: data.mailboxcontext,
                mailboxuser: data.mailboxuser,
                msg_id: data.msg_id,
                call_id: data.call_id,
                flag: data.flag,
                origtime: data.origtime,
                duration: data.duration,
            })
            return voicemailSpool
        })

        for (const voicemailSpool of voicemailSpoolObjects) {
            const createdVoicemail = await db.kamailio.VoicemailSpool.save(voicemailSpool)
            createdVoicemailIds.push(createdVoicemail.id)
        }
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    it('should be defined', () => {
        expect(app).toBeDefined()
    })

    it('db connection', () => {
        expect(appService.isDbInitialised).toBe(true)
        expect(appService.isDbAvailable).toBe(true)
    })

    it('mock authService.compareBcryptPassword', async () => {
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    it('obtain auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('GET', () => {
            it('should get all voicemails', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(25)
            })
            it('should get all voicemails in Old folder', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=Old')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(3)
            })
            it('should get all voicemails in Old or Friends Folder', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=Old,Friends')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(6)
            })
            it('should get all voicemails in Friends or Family by wildcard F*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=F*')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(6)
            })
            it('should get all voicemails in Cust folders by *st* wildcard', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=*st*')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(13)
            })
            it('should get all voicemails in Cust or Family folders by F*,Cust*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=F*,Cust*')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(19)
            })
            it('should get all voicemails in Old or Cust folders by Old,Cust*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=Old,Cust*')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(16)
            })
            it('should get all voicemails in Inbox', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=inbox')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(1)
            })
            it('should get all voicemails in Inbox by wildcard i*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=inbox')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(1)
            })
            it('should get all voicemails in Inbox and Old by wildcard i*,Old', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails?folder=i*,old')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const voicemails: {data: VoicemailResponseDto[], total_count: number} = response.body
                expect(response.status).toEqual(200)
                expect(voicemails.total_count).toBeGreaterThanOrEqual(4)
            })
        })

        describe('GET by id', () => {
            it('should get a voicemail by id', async () => {
                const id = createdVoicemailIds[0]
                const response = await request(app.getHttpServer())
                    .get(`/api/voicemails/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(id)
                expect(response.body.call_id).toEqual('76d762ae_pbx-1')
                expect(response.body.duration).toEqual('173')
                expect(response.body.folder).toEqual('Old')
            })
        })

        describe('DELETE by id', () => {
            it('should delete a voicemail and then not find it', async () => {
                const spool = await db.kamailio.VoicemailSpool.findOneByOrFail({id: createdVoicemailIds[0]})
                const id = (await db.kamailio.VoicemailSpool.save(db.kamailio.VoicemailSpool.create({
                    msgnum: 9100,
                    dir: `${voicemailSpoolDir}${spool.mailboxuser}/Old`,
                    context: spool.context,
                    mailboxcontext: spool.mailboxcontext,
                    mailboxuser: spool.mailboxuser,
                    msg_id: 'delete-test',
                    call_id: 'delete-test',
                    flag: '',
                    origtime: spool.origtime,
                    duration: spool.duration,
                }))).id
                createdVoicemailIds.push(id)
                const notify = jest.spyOn(app.get(VoicemailService), 'sendNotification').mockResolvedValue()
                const response = await request(app.getHttpServer())
                    .delete(`/api/voicemails/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(204)
                expect(notify).toHaveBeenCalledWith(expect.objectContaining({id: id}), expect.anything(), 'd')
                const get = await request(app.getHttpServer())
                    .get(`/api/voicemails/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(get.status).toEqual(404)
            })
        })

        describe('PUT/PATCH folder', () => {
            let basePath: string
            let inboxId: number
            let oldId: number

            const readDir = async (id: number): Promise<string> =>
                (await db.kamailio.VoicemailSpool.findOneByOrFail({id: id})).dir

            beforeAll(async () => {
                jest.spyOn(app.get(VoicemailService), 'sendNotification').mockResolvedValue()
                const existing = await db.kamailio.VoicemailSpool.findOneByOrFail({id: createdVoicemailIds[0]})
                basePath = `${voicemailSpoolDir}${existing.mailboxuser}`
                const create = (msgnum: number, folder: string): db.kamailio.VoicemailSpool => db.kamailio.VoicemailSpool.create({
                    msgnum: msgnum,
                    dir: `${basePath}/${folder}`,
                    context: existing.context,
                    mailboxcontext: existing.mailboxcontext,
                    mailboxuser: existing.mailboxuser,
                    msg_id: `folder-test-${folder}`,
                    call_id: `folder-test-${folder}`,
                    flag: '',
                    origtime: existing.origtime,
                    duration: existing.duration,
                })
                inboxId = (await db.kamailio.VoicemailSpool.save(create(9000, 'INBOX'))).id
                oldId = (await db.kamailio.VoicemailSpool.save(create(9000, 'Old'))).id
                createdVoicemailIds.push(inboxId, oldId)
            })

            it('PUT same folder keeps full path', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/voicemails/${oldId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({folder: 'Old'})
                expect(response.status).toEqual(200)
                expect(response.body.folder).toEqual('Old')
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PUT bulk same folder keeps full path', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/voicemails')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({[oldId]: {folder: 'Old'}})
                expect(response.status).toEqual(204)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PATCH same folder keeps full path', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/voicemails/${oldId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/folder', value: 'Old'}])
                expect(response.status).toEqual(204)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PATCH bulk same folder keeps full path', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/voicemails')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({[oldId]: [{op: 'replace', path: '/folder', value: 'Old'}]})
                expect(response.status).toEqual(204)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PUT move writes full path', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/voicemails/${inboxId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({folder: 'Old'})
                expect(response.status).toEqual(200)
                expect(response.body.folder).toEqual('Old')
                expect(await readDir(inboxId)).toEqual(`${basePath}/Old`)
            })

            it('PATCH move writes full path', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/voicemails/${inboxId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/folder', value: 'INBOX'}])
                expect(response.status).toEqual(200)
                expect(response.body.folder).toEqual('INBOX')
                expect(await readDir(inboxId)).toEqual(`${basePath}/INBOX`)
            })

            it('PUT repairs a stored dir without full path', async () => {
                await db.kamailio.VoicemailSpool.update(oldId, {dir: 'Old'})
                const response = await request(app.getHttpServer())
                    .put(`/api/voicemails/${oldId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({folder: 'Old'})
                expect(response.status).toEqual(204)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PUT folder as full path fails with 422', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/voicemails/${oldId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({folder: `${basePath}/INBOX`})
                expect(response.status).toEqual(422)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })

            it('PATCH folder in wrong case fails with 422', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/voicemails/${oldId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/folder', value: 'inbox'}])
                expect(response.status).toEqual(422)
                expect(await readDir(oldId)).toEqual(`${basePath}/Old`)
            })
        })

        describe('reseller scope', () => {
            const login = async (loginCreds: {username: string, password: string}): Promise<[string, string]> => {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(loginCreds)
                expect(response.status).toEqual(201)
                return ['Authorization', 'Bearer ' + response.body['access_token']]
            }

            it('create another reseller and log in as reseller admins', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId,
                    name: `vm_reseller_${process.env.JEST_WORKER_ID}_${Date.now()}`,
                    status: ResellerStatus.Active,
                }).save()).id
                await insertResellerAdmin(otherResellerCreds.username, otherResellerId)
                await insertResellerAdmin(reseller1Creds.username, 1)
                otherResellerHeader = await login(otherResellerCreds)
                reseller1Header = await login(reseller1Creds)
            })

            it('not list voicemails of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/voicemails')
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })

            it('not read a voicemail of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/voicemails/${createdVoicemailIds[0]}`)
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })

            it('not update a voicemail of another reseller', async () => {
                const id = createdVoicemailIds[0]
                const dir = (await db.kamailio.VoicemailSpool.findOneByOrFail({id: id})).dir
                const put = await request(app.getHttpServer())
                    .put(`/api/voicemails/${id}`)
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({folder: 'INBOX'})
                expect(put.status).toEqual(422)
                const putMany = await request(app.getHttpServer())
                    .put('/api/voicemails')
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({[id]: {folder: 'INBOX'}})
                expect(putMany.status).toEqual(422)
                const patch = await request(app.getHttpServer())
                    .patch(`/api/voicemails/${id}`)
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/folder', value: 'INBOX'}])
                expect(patch.status).toEqual(404)
                expect((await db.kamailio.VoicemailSpool.findOneByOrFail({id: id})).dir).toEqual(dir)
            })

            it('not delete a voicemail of another reseller', async () => {
                const id = createdVoicemailIds[0]
                const response = await request(app.getHttpServer())
                    .delete(`/api/voicemails/${id}`)
                    .set(...otherResellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(422)
                expect(await db.kamailio.VoicemailSpool.findOneBy({id: id})).not.toBeNull()
            })

            it('read own voicemails as reseller admin', async () => {
                const id = createdVoicemailIds[0]
                const response = await request(app.getHttpServer())
                    .get(`/api/voicemails/${id}`)
                    .set(...reseller1Header)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(id)
            })
        })
    })

    describe('Voicemail DELETE', () => {
        it('delete created voicemails and fixtures', async () => {
            if (createdVoicemailIds.length) {
                await db.billing.Journal.delete({
                    resource_name: 'voicemails',
                    resource_id: In(createdVoicemailIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
                await db.kamailio.VoicemailSpool.delete(createdVoicemailIds)
            }
            if (mailboxUuid)
                await appService.db.query('DELETE FROM kamailio.voicemail_users WHERE customer_id = ?', [mailboxUuid])
            if (provisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberId)
            if (contractId)
                await db.billing.Contract.delete(contractId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: otherResellerCreds.username})
            await db.billing.Admin.delete({login: reseller1Creds.username})
        })
    })
})
