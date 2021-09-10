import {Test, TestingModule} from '@nestjs/testing'
import {SubscriberpreferencesController} from './subscriberpreferences.controller'

describe('SubscriberpreferencesController', () => {
    let controller: SubscriberpreferencesController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriberpreferencesController],
        }).compile()

        controller = module.get<SubscriberpreferencesController>(SubscriberpreferencesController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
