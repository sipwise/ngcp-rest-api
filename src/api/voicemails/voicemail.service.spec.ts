import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Test, TestingModule} from '@nestjs/testing'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {VoicemailModule} from './voicemail.module'
import {VoicemailService} from './voicemail.service'
import {VoicemailMockRepository} from './repositories/voicemail.mock.repository'
import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

describe('VoicemailsService', () => {
    let service: VoicemailService
    let voicemailMockRepo: VoicemailMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        voicemailMockRepo = new VoicemailMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [VoicemailModule, ExpandModule, AppModule],
        })
            .overrideProvider(VoicemailMariadbRepository).useValue(voicemailMockRepo)
            .compile()

        service = module.get<VoicemailService>(VoicemailService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(voicemailMockRepo).toBeDefined()
    })

    describe('read', () => {

    })

    describe('readAll', () => {

    })

    describe('create', () => {

    })

    describe('update', () => {

    })

    describe('adjust', () => {

    })

    describe('delete', () => {

    })
})
