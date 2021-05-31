import {Test, TestingModule} from '@nestjs/testing'
import {ContactsController} from './contacts.controller'
import {contactsProviders} from './contacts.provider'
import {ContactsService} from './contacts.service'
import {AdminsService} from '../admins/admins.service'
import {adminsProviders} from '../admins/admins.providers'
import {Contact} from './contact.entity'

describe('ContactsController', () => {
    let controller: ContactsController
    let service = {findOne: async () => [new Contact()]}

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ContactsController],
            providers: [ContactsService, ...contactsProviders, AdminsService, ...adminsProviders],
        }).overrideProvider(ContactsService)
            .useValue(service)
            .compile()

        controller = module.get<ContactsController>(ContactsController)

    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })
})
