import {Test, TestingModule} from '@nestjs/testing'
import {JournalsService} from './journals.service'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {JournalsMockRepository} from './repositories/journals.mock.repository'
import {JournalsMariadbRepository} from './repositories/journals.mariadb.repository'
import {JournalsModule} from './journals.module'

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

describe('JournalsService', () => {
    let service: JournalsService
    let journalsMockRepo: JournalsMockRepository

    let sr: ServiceRequest

    beforeEach(async () => {
        journalsMockRepo = new JournalsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [JournalsModule, ExpandModule, AppModule],
        })
            .overrideProvider(JournalsMariadbRepository).useValue(journalsMockRepo)
            .compile()

        service = module.get<JournalsService>(JournalsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(journalsMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of customer contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await journalsMockRepo.readAll(sr))
        })
    })

    describe('writeJournal', () => {

    })
})
