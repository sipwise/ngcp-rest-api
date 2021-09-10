import {Test, TestingModule} from '@nestjs/testing'
import {CustomerpreferencesController} from './customerpreferences.controller'

describe('CustomerpreferencesController', () => {
    let controller: CustomerpreferencesController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CustomerpreferencesController],
        }).compile()

        controller = module.get<CustomerpreferencesController>(CustomerpreferencesController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
