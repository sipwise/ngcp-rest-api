import {Test, TestingModule} from '@nestjs/testing'
import {ResellersService} from './resellers.service'

describe('ResellersService', () => {
    let service: ResellersService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ResellersService],
        }).compile()

        service = module.get<ResellersService>(ResellersService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
