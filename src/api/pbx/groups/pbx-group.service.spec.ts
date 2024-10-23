import {Test, TestingModule} from '@nestjs/testing'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {ExpandModule} from '~/helpers/expand.module'
import {AppModule} from '~/app.module'
import {PbxGroupMockRepository} from '~/api/pbx/groups/repositories/pbx-group.mock.repository'
import {PbxGroupModule} from '~/api/pbx/groups/pbx-group.module'
import {PbxGroupMariadbRepository} from '~/api/pbx/groups/repositories/pbx-group.mariadb.repository'
import {PbxGroupService} from '~/api/pbx/groups/pbx-group.service'

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

describe('PbxGroupService', () => {
    let service: PbxGroupService
    let pbxGroupMockRepo: PbxGroupMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        pbxGroupMockRepo = new PbxGroupMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [PbxGroupModule, ExpandModule, AppModule],
        })
            .overrideProvider(PbxGroupMariadbRepository).useValue(pbxGroupMockRepo)
            .compile()

        service = module.get<PbxGroupService>(PbxGroupService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent:undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(pbxGroupMockRepo).toBeDefined()
    })
    describe('read', () => {
        it('should return a pbxgroup by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await pbxGroupMockRepo.readById(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of pbxgroups', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await pbxGroupMockRepo.readAll(sr))
        })
    })
})
