import {Test, TestingModule} from '@nestjs/testing'
import {EmailtemplatesService} from './emailtemplates.service'

describe('EmailtemplatesService', () => {
    let service: EmailtemplatesService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EmailtemplatesService],
        }).compile()

        service = module.get<EmailtemplatesService>(EmailtemplatesService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
