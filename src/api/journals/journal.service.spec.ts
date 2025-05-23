import {Test, TestingModule} from '@nestjs/testing'

import {JournalModule} from './journal.module'
import {JournalService} from './journal.service'
import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'
import {JournalMockRepository} from './repositories/journal.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ExpandModule} from '~/helpers/expand.module'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

describe('JournalService', () => {
    let service: JournalService
    let journalMockRepo: JournalMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        journalMockRepo = new JournalMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [JournalModule, ExpandModule, AppModule],
        })
            .overrideProvider(JournalMariadbRepository).useValue(journalMockRepo)
            .compile()

        service = module.get<JournalService>(JournalService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent:undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(journalMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of customer contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await journalMockRepo.readAll(sr))
        })
    })

    // describe('writeJournal', () => {

    // })
})
