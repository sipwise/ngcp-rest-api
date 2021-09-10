import {Test, TestingModule} from '@nestjs/testing'
import {EmailtemplatesController} from './emailtemplates.controller'

describe('EmailtemplatesController', () => {
    let controller: EmailtemplatesController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EmailtemplatesController],
        }).compile()

        controller = module.get<EmailtemplatesController>(EmailtemplatesController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
