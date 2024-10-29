import {Test, TestingModule} from '@nestjs/testing'

import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'
import {VoicemailMockRepository} from './repositories/voicemail.mock.repository'
import {VoicemailModule} from './voicemail.module'
import {VoicemailService} from './voicemail.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ExpandModule} from '~/helpers/expand.module'
import {ServiceRequest} from '~/interfaces/service-request.interface'

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let sr: ServiceRequest

    beforeAll(async () => {
        voicemailMockRepo = new VoicemailMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [VoicemailModule, ExpandModule, AppModule],
        })
            .overrideProvider(VoicemailMariadbRepository).useValue(voicemailMockRepo)
            .compile()

        service = module.get<VoicemailService>(VoicemailService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent:undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(voicemailMockRepo).toBeDefined()
    })

    // describe('read', () => {

    // })

    // describe('readAll', () => {

    // })

    // describe('create', () => {

    // })

    // describe('update', () => {

    // })

    // describe('adjust', () => {

    // })

    // describe('delete', () => {

    // })
})
