import {Test, TestingModule} from '@nestjs/testing'
import {JournalService} from './journal.service'

describe('JournalingService', () => {
    let service: JournalService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [JournalService],
        }).compile()

        service = module.get<JournalService>(JournalService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
