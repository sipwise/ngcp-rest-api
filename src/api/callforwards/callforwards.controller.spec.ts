import {Test, TestingModule} from '@nestjs/testing'
import {CallforwardsController} from './callforwards.controller'

describe('CallforwardsController', () => {
    let controller: CallforwardsController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CallforwardsController],
        }).compile()

        controller = module.get<CallforwardsController>(CallforwardsController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
