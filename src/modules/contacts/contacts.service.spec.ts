import {Test, TestingModule} from '@nestjs/testing';
import {ContactsService} from './contacts.service';
import {contactsProviders} from "./contacts.provider";
import {Contact} from "./contact.entity";
import {Repository} from "sequelize-typescript";

describe('ContactsService', () => {
  let contactsService: ContactsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
      ],
    }).compile();

    contactsService = module.get<ContactsService>(ContactsService);
  });

  it('should be defined', () => {
    expect(contactsService).toBeDefined();
  });
});
