import {Test, TestingModule} from '@nestjs/testing'
import {ResellerbrandinglogosController} from './resellerbrandinglogos.controller'

describe('ResellerbrandinglogosController', () => {
    let controller: ResellerbrandinglogosController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ResellerbrandinglogosController],
        }).compile()

        controller = module.get<ResellerbrandinglogosController>(ResellerbrandinglogosController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
