import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Test, TestingModule} from '@nestjs/testing'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {VoicemailsModule} from './voicemails.module'
import {VoicemailsService} from './voicemails.service'
import {VoicemailsMockRepository} from './repositories/voicemails.mock.repository'
import {VoicemailsMariadbRepository} from './repositories/voicemails.mariadb.repository'

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
    let service: VoicemailsService
    let voicemailsMockRepo: VoicemailsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        voicemailsMockRepo = new VoicemailsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [VoicemailsModule, ExpandModule, AppModule],
        })
            .overrideProvider(VoicemailsMariadbRepository).useValue(voicemailsMockRepo)
            .compile()

        service = module.get<VoicemailsService>(VoicemailsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(voicemailsMockRepo).toBeDefined()
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
