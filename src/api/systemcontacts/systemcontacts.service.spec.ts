import {Test, TestingModule} from '@nestjs/testing'
import {SystemcontactsService} from './systemcontacts.service'

describe('SystemcontactsService', () => {
    let service: SystemcontactsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SystemcontactsService],
        }).compile()

        service = module.get<SystemcontactsService>(SystemcontactsService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
