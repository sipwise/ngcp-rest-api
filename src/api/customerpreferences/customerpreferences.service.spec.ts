import {Test, TestingModule} from '@nestjs/testing'
import {CustomerpreferencesService} from './customerpreferences.service'

describe('CustomerpreferencesService', () => {
    let service: CustomerpreferencesService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CustomerpreferencesService],
        }).compile()

        service = module.get<CustomerpreferencesService>(CustomerpreferencesService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
