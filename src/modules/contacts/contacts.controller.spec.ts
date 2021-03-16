import { Test, TestingModule } from '@nestjs/testing';
import { CONTACT_REPOSITORY } from 'src/core/constants';
import { ContactsController } from './contacts.controller';
import { contactsProviders } from './contacts.provider';
import { ContactsService } from './contacts.service';

describe('ContactsController', () => {
  let controller: ContactsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        ContactsService,
      ],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
