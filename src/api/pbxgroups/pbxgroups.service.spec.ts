import {Test, TestingModule} from '@nestjs/testing'
import {PbxgroupsService} from './pbxgroups.service'

describe('PbxgroupsService', () => {
    let service: PbxgroupsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PbxgroupsService],
        }).compile()

        service = module.get<PbxgroupsService>(PbxgroupsService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})
