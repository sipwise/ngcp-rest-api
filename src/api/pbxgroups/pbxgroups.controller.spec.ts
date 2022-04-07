import {Test, TestingModule} from '@nestjs/testing'
import {PbxgroupsController} from './pbxgroups.controller'

describe('PbxgroupsController', () => {
    let controller: PbxgroupsController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PbxgroupsController],
        }).compile()

        controller = module.get<PbxgroupsController>(PbxgroupsController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
