import {Test, TestingModule} from '@nestjs/testing'
import {VoicemailsettingsService} from './voicemailsettings.service'

describe('VoicemailsettingsService', () => {
    let service: VoicemailsettingsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [VoicemailsettingsService],
        }).compile()

        service = module.get<VoicemailsettingsService>(VoicemailsettingsService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
