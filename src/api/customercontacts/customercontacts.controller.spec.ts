import {Test, TestingModule} from '@nestjs/testing'
import {CustomercontactsController} from './customercontacts.controller'
import {CustomercontactsService} from './customercontacts.service'
import {Contact} from '../../entities/db/billing/contact.entity'

describe('ContactsController', () => {
    let controller: CustomercontactsController
    const service = {findOne: async () => [new Contact()]}

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CustomercontactsController],
            providers: [CustomercontactsService],
        }).overrideProvider(CustomercontactsService)
            .useValue(service)
            .compile()

        controller = module.get<CustomercontactsController>(CustomercontactsController)

    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
