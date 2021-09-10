import {Test, TestingModule} from '@nestjs/testing'
import {VoicemailsController} from './voicemails.controller'

describe('VoicemailsController', () => {
    let controller: VoicemailsController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VoicemailsController],
        }).compile()

        controller = module.get<VoicemailsController>(VoicemailsController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
