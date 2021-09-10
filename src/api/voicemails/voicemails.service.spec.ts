import {Test, TestingModule} from '@nestjs/testing'
import {VoicemailsService} from './voicemails.service'

describe('VoicemailsService', () => {
    let service: VoicemailsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [VoicemailsService],
        }).compile()

        service = module.get<VoicemailsService>(VoicemailsService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
