import {Test, TestingModule} from '@nestjs/testing'
import {AuthResponseDto} from '../../../../auth/dto/auth-response.dto'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {ExpandModule} from '../../../../helpers/expand.module'
import {AppModule} from '../../../../app.module'
import {PbxGroupMockRepository} from './repositories/pbx-group-member.mock.repository'
import {PbxGroupMemberModule} from './pbx-group-member.module'
import {PbxGroupMemberMariadbRepository} from './repositories/pbx-group-member.mariadb.repository'
import {PbxGroupMemberService} from './pbx-group-member.service'

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

describe('PbxGroupMemberService', () => {
    let service: PbxGroupMemberService
    let pbxGroupMemberMockRepo: PbxGroupMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        pbxGroupMemberMockRepo = new PbxGroupMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [PbxGroupMemberModule, ExpandModule, AppModule],
        })
            .overrideProvider(PbxGroupMemberMariadbRepository).useValue(pbxGroupMemberMockRepo)
            .compile()

        service = module.get<PbxGroupMemberService>(PbxGroupMemberService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(pbxGroupMemberMockRepo).toBeDefined()
    })
    describe('read', () => {
        it('should return a pbxgroup member by id', async () => {
            const result = await service.read(1, sr)
            expect(result).toStrictEqual(await pbxGroupMemberMockRepo.readById(1, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('readAll', () => {
        it('should return an array of pbxgroup members', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await pbxGroupMemberMockRepo.readAll(sr))
        })
    })
})
