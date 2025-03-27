import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {VoicemailModule} from './voicemail.module'

import {VoicemailResponseDto} from '~/api/voicemails/dto/voicemail-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const creds = {username: 'administrator', password: 'administrator'}
    let createdVoicemailIds: number[]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [VoicemailModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()

        const subscriber = await db.billing.VoipSubscriber.find({
            order: {
                id: 'ASC',
            },
        })

        const voicemailSpools = [
            {msgnum: 1, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807094', duration: '173', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807094-00000073', call_id: '76d762ae_pbx-1'},
            {msgnum: 2, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807100', duration: '160', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807100-00000074', call_id: '76d762ae_pbx-2'},
            {msgnum: 3, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807105', duration: '145', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807105-00000075', call_id: '76d762ae_pbx-3'},
            {msgnum: 4, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807110', duration: '130', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807110-00000076', call_id: '76d762ae_pbx-4'},
            {msgnum: 5, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807115', duration: '140', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807115-00000077', call_id: '76d762ae_pbx-5'},
            {msgnum: 6, dir: '/var/spool/asterisk/voicemail/default/Cust2/Cust2', context: 'voicemailcaller_unavail', origtime: '1594807120', duration: '155', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807120-00000078', call_id: '76d762ae_pbx-6'},
            {msgnum: 7, dir: '/var/spool/asterisk/voicemail/default/Cust3/Cust3', context: 'voicemailcaller_unavail', origtime: '1594807125', duration: '135', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807125-00000079', call_id: '76d762ae_pbx-7'},
            {msgnum: 8, dir: '/var/spool/asterisk/voicemail/default/Cust4/Cust4', context: 'voicemailcaller_unavail', origtime: '1594807130', duration: '145', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807130-00000080', call_id: '76d762ae_pbx-8'},
            {msgnum: 9, dir: '/var/spool/asterisk/voicemail/default/Cust5/Cust5', context: 'voicemailcaller_unavail', origtime: '1594807135', duration: '150', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807135-00000081', call_id: '76d762ae_pbx-9'},
            {msgnum: 10, dir: '/var/spool/asterisk/voicemail/default/Cust6/Cust6', context: 'voicemailcaller_unavail', origtime: '1594807140', duration: '160', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807140-00000082', call_id: '76d762ae_pbx-10'},
            {msgnum: 11, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807145', duration: '170', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807145-00000083', call_id: '76d762ae_pbx-11'},
            {msgnum: 12, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807150', duration: '150', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807150-00000084', call_id: '76d762ae_pbx-12'},
            {msgnum: 13, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807155', duration: '130', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807155-00000085', call_id: '76d762ae_pbx-13'},
            {msgnum: 14, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807160', duration: '140', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807160-00000086', call_id: '76d762ae_pbx-14'},
            {msgnum: 15, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807165', duration: '155', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807165-00000087', call_id: '76d762ae_pbx-15'},
            {msgnum: 16, dir: '/var/spool/asterisk/voicemail/default/Cust2/Cust2', context: 'voicemailcaller_unavail', origtime: '1594807170', duration: '160', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807170-00000088', call_id: '76d762ae_pbx-16'},
            {msgnum: 17, dir: '/var/spool/asterisk/voicemail/default/Cust3/Cust3', context: 'voicemailcaller_unavail', origtime: '1594807175', duration: '170', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807175-00000089', call_id: '76d762ae_pbx-17'},
            {msgnum: 18, dir: '/var/spool/asterisk/voicemail/default/Cust4/Cust4', context: 'voicemailcaller_unavail', origtime: '1594807180', duration: '160', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807180-00000090', call_id: '76d762ae_pbx-18'},
            {msgnum: 19, dir: '/var/spool/asterisk/voicemail/default/Cust5/Cust5', context: 'voicemailcaller_unavail', origtime: '1594807185', duration: '150', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807185-00000091', call_id: '76d762ae_pbx-19'},
            {msgnum: 20, dir: '/var/spool/asterisk/voicemail/default/Cust6/Cust6', context: 'voicemailcaller_unavail', origtime: '1594807190', duration: '155', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807190-00000092', call_id: '76d762ae_pbx-20'},
            {msgnum: 21, dir: '/var/spool/asterisk/voicemail/default/Old/Old', context: 'voicemailcaller_unavail', origtime: '1594807195', duration: '165', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807195-00000093', call_id: '76d762ae_pbx-21'},
            {msgnum: 22, dir: '/var/spool/asterisk/voicemail/default/Work/Work', context: 'voicemailcaller_unavail', origtime: '1594807200', duration: '150', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807200-00000094', call_id: '76d762ae_pbx-22'},
            {msgnum: 23, dir: '/var/spool/asterisk/voicemail/default/Friends/Friends', context: 'voicemailcaller_unavail', origtime: '1594807205', duration: '140', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807205-00000095', call_id: '76d762ae_pbx-23'},
            {msgnum: 24, dir: '/var/spool/asterisk/voicemail/default/Family/Family', context: 'voicemailcaller_unavail', origtime: '1594807210', duration: '130', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807210-00000096', call_id: '76d762ae_pbx-24'},
            {msgnum: 25, dir: '/var/spool/asterisk/voicemail/default/Cust1/Cust1', context: 'voicemailcaller_unavail', origtime: '1594807215', duration: '145', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807215-00000097', call_id: '76d762ae_pbx-25'},
            {msgnum: 26, dir: '/var/spool/asterisk/voicemail/default/Cust1/INBOX', context: 'voicemailcaller_unavail', origtime: '1594807215', duration: '145', mailboxuser: subscriber[0].uuid, mailboxcontext: 'default', flag: '', msg_id: '1594807215-00000097', call_id: '76d762ae_pbx-25'},
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

        createdVoicemailIds = []
        for (const voicemailSpool of voicemailSpoolObjects) {
            const createdVoicemail = await db.kamailio.VoicemailSpool.save(voicemailSpool)
            createdVoicemailIds.push(createdVoicemail.id)
        }
    })

    afterAll(async () => {
        await db.kamailio.VoicemailSpool.delete(createdVoicemailIds)
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
            .post('/auth/jwt')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('GET', () => {
            it('should get all voicemails', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(25)
            })
            it('should get all voicemails in Old folder', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=Old')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(3)
            })
            it('should get all voicemails in Old or Friends Folder', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=Old,Friends')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(6)
            })
            it('should get all voicemails in Friends or Family by wildcard F*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=F*')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(6)
            })
            it('should get all voicemails in Cust folders by *st* wildcard', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=*st*')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(13)
            })
            it('should get all voicemails in Cust or Family folders by F*,Cust*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=F*,Cust*')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(19)
            })
            it('should get all voicemails in Old or Cust folders by Old,Cust*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=Old,Cust*')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(16)
            })
            it('should get all voicemails in Inbox', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=inbox')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(1)
            })
            it('should get all voicemails in Inbox by wildcard i*', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=inbox')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(1)
            })
            it('should get all voicemails in Inbox and Old by wildcard i*,Old', async () => {
                const response = await request(app.getHttpServer())
                    .get('/voicemails?folder=i*,old')
                    .set(...authHeader)
                const voicemails: VoicemailResponseDto = response.body
                expect(response.status).toEqual(200)
                expect(voicemails).toHaveLength(2)
                expect(voicemails[1]).toBeGreaterThanOrEqual(4)
            })
        })
    })
})