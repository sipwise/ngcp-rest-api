import {Test, TestingModule} from '@nestjs/testing'
import {SubscriberpreferencesService} from './subscriberpreferences.service'

describe('SubscriberpreferencesService', () => {
    let service: SubscriberpreferencesService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SubscriberpreferencesService],
        }).compile()

        service = module.get<SubscriberpreferencesService>(SubscriberpreferencesService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
