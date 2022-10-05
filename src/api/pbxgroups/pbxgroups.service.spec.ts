import {Test, TestingModule} from '@nestjs/testing'
import {PbxgroupsService} from './pbxgroups.service'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ExpandModule} from '../../helpers/expand.module'
import {AppModule} from '../../app.module'
import {PbxgroupsMockRepository} from './repositories/pbxgroups.mock.repository'
import {PbxgroupsModule} from './pbxgroups.module'
import {PbxgroupsMariadbRepository} from './repositories/pbxgroups.mariadb.repository'

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

describe('PbxgroupsService', () => {
    let service: PbxgroupsService
    let pbxgroupsMockRepo: PbxgroupsMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        pbxgroupsMockRepo = new PbxgroupsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [PbxgroupsModule, ExpandModule, AppModule],
        })
            .overrideProvider(PbxgroupsMariadbRepository).useValue(pbxgroupsMockRepo)
            .compile()

        service = module.get<PbxgroupsService>(PbxgroupsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user, init: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(pbxgroupsMockRepo).toBeDefined()
    })
    describe('read', () => {
        it('should return a pbxgroup by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await pbxgroupsMockRepo.readById(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of pbxgroups', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await pbxgroupsMockRepo.readAll(sr))
        })
    })
})
