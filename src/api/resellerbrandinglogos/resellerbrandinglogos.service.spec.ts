import {Test, TestingModule} from '@nestjs/testing'
import {ResellerbrandinglogosService} from './resellerbrandinglogos.service'

describe('ResellerbrandinglogosService', () => {
    let service: ResellerbrandinglogosService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ResellerbrandinglogosService],
        }).compile()

        service = module.get<ResellerbrandinglogosService>(ResellerbrandinglogosService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
