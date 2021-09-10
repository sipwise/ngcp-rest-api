import {Test, TestingModule} from '@nestjs/testing'
import {SubscribersController} from './subscribers.controller'

describe('SubscribersController', () => {
    let controller: SubscribersController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscribersController],
        }).compile()

        controller = module.get<SubscribersController>(SubscribersController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
