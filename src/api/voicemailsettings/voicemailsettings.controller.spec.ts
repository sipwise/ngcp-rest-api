import {Test, TestingModule} from '@nestjs/testing'
import {VoicemailsettingsController} from './voicemailsettings.controller'

describe('VoicemailsettingsController', () => {
    let controller: VoicemailsettingsController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VoicemailsettingsController],
        }).compile()

        controller = module.get<VoicemailsettingsController>(VoicemailsettingsController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
