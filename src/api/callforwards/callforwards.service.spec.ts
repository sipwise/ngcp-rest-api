import {Test, TestingModule} from '@nestjs/testing'
import {CallforwardsService} from './callforwards.service'

describe('CallforwardsService', () => {
    let service: CallforwardsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CallforwardsService],
        }).compile()

        service = module.get<CallforwardsService>(CallforwardsService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
