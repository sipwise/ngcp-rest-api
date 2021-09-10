import {Test, TestingModule} from '@nestjs/testing'
import {CustomercontactsService} from './customercontacts.service'

describe('ContactsService', () => {
    let contactsService: CustomercontactsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomercontactsService,
            ],
        }).compile()

        contactsService = module.get<CustomercontactsService>(CustomercontactsService)
    })

    it('should be defined', () => {
        expect(contactsService).toBeDefined()
    })
})
