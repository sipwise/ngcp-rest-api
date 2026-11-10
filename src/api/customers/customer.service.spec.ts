import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {CustomerModule} from './customer.module'
import {CustomerService} from './customer.service'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'
import {CustomerMockRepository} from './repositories/customer.mock.repository'

import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {ContactMockRepository} from '~/api/contacts/repositories/contact.mock.repository'
import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const admin: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

const resellerUser: AuthResponseDto = {...admin, id: 2, role: 'reseller', reseller_id: 1, reseller_id_required: true}

const day = 24 * 60 * 60 * 1000

describe('CustomerService', () => {
    let service: CustomerService
    let customerMockRepo: CustomerMockRepository
    let contactMockRepo: ContactMockRepository

    const makeSr = (user: AuthResponseDto = admin, query: object = {}): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {...query},
        user,
        req: undefined,
    })

    const newCustomer = (data: Partial<internal.Customer>): internal.Customer => internal.Customer.create({
        contactId: 2,
        status: ContractStatus.Active,
        type: CustomerType.SipAccount,
        billingProfileDefinition: ContractBillingProfileDefinition.ID,
        billingProfileId: 1,
        ...data,
    })

    const profile = (data: Partial<internal.CustomerBillingProfile>): internal.CustomerBillingProfile =>
        internal.CustomerBillingProfile.create({id: 1, networkId: undefined, startDate: undefined, endDate: undefined, ...data})

    beforeAll(async () => {
        customerMockRepo = new CustomerMockRepository()
        contactMockRepo = new ContactMockRepository()
        // contact 4: customer contact of reseller 2, contact 5: terminated customer contact of reseller 1
        await contactMockRepo.create([
            internal.Contact.create({reseller_id: 2, status: ContactStatus.Active}),
            internal.Contact.create({reseller_id: 1, status: ContactStatus.Terminated}),
        ], makeSr())
        const module: TestingModule = await Test.createTestingModule({
            imports: [CustomerModule, ExpandModule, AppModule],
        })
            .overrideProvider(CustomerMariadbRepository).useValue(customerMockRepo)
            .overrideProvider(ContactMariadbRepository).useValue(contactMockRepo)
            .compile()

        service = module.get<CustomerService>(CustomerService)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(customerMockRepo).toBeDefined()
    })

    describe('create', () => {
        it('should create a customer with a billing profile mapping and an initial balance', async () => {
            const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
            const balance = jest.spyOn(customerMockRepo, 'createInitialBalance')
            const [created] = await service.create([newCustomer({type: CustomerType.PbxAccount})], makeSr())
            expect(created.productId).toBe(5)
            expect(created.createTimestamp).toBeInstanceOf(Date)
            expect(created.billingProfileId).toBeUndefined()
            expect(created.billingProfileDefinition).toBeUndefined()
            expect(append).toHaveBeenCalledWith(created.id, [
                internal.BillingMapping.create({billingProfileId: 1, networkId: undefined, startDate: undefined, endDate: undefined}),
            ])
            expect(balance).toHaveBeenCalledWith(created.id)
        })

        it('should reject an unknown contact', async () => {
            await expect(service.create([newCustomer({contactId: 100})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject a system contact', async () => {
            await expect(service.create([newCustomer({contactId: 1})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject a terminated contact', async () => {
            await expect(service.create([newCustomer({contactId: 5})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject a contact of another reseller for a reseller user', async () => {
            await expect(service.create([newCustomer({contactId: 4, billingProfileId: 2})], makeSr(resellerUser)))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject an unknown type', async () => {
            await expect(service.create([newCustomer({type: 'invalid' as CustomerType})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject an unknown billing profile', async () => {
            await expect(service.create([newCustomer({billingProfileId: 99})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject a terminated billing profile', async () => {
            await expect(service.create([newCustomer({billingProfileId: 4})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject a billing profile of another reseller', async () => {
            await expect(service.create([newCustomer({billingProfileId: 2})], makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should fail when the created customers cannot be read back', async () => {
            jest.spyOn(customerMockRepo, 'readWhereInIds').mockResolvedValueOnce([])
            await expect(service.create([newCustomer({})], makeSr()))
                .rejects.toThrow(UnprocessableEntityException)
        })

        describe('package', () => {
            const pkgCustomer = (profilePackageId: number): internal.Customer => newCustomer({
                billingProfileDefinition: ContractBillingProfileDefinition.Package,
                billingProfileId: undefined,
                profilePackageId,
            })

            it('should create the mappings from the package initial profiles', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                const [created] = await service.create([pkgCustomer(1)], makeSr())
                expect(append).toHaveBeenCalledWith(created.id, [
                    internal.BillingMapping.create({billingProfileId: 1, networkId: undefined, startDate: undefined, endDate: undefined}),
                    internal.BillingMapping.create({billingProfileId: 3, networkId: 1, startDate: undefined, endDate: undefined}),
                ])
            })

            it('should reject a package of another reseller', async () => {
                await expect(service.create([pkgCustomer(2)], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })
        })

        describe('profiles', () => {
            const profilesCustomer = (billingProfiles: internal.CustomerBillingProfile[]): internal.Customer => newCustomer({
                billingProfileDefinition: ContractBillingProfileDefinition.Profiles,
                billingProfileId: undefined,
                billingProfiles,
            })

            it('should create the mappings from the profiles', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                const start = new Date(Date.now() + day)
                const end = new Date(Date.now() + 2 * day)
                const [created] = await service.create([profilesCustomer([
                    profile({id: 1}),
                    profile({id: 3, networkId: 1, startDate: start, endDate: end}),
                ])], makeSr())
                expect(append).toHaveBeenCalledWith(created.id, [
                    internal.BillingMapping.create({billingProfileId: 1, networkId: null, startDate: undefined, endDate: undefined}),
                    internal.BillingMapping.create({billingProfileId: 3, networkId: 1, startDate: start, endDate: end}),
                ])
            })

            it('should require an open interval without network', async () => {
                await expect(service.create([profilesCustomer([profile({id: 1, networkId: 1})])], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })

            it('should require profiles', async () => {
                await expect(service.create([profilesCustomer(undefined)], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })

            it('should reject an end date without start date', async () => {
                await expect(service.create([profilesCustomer([
                    profile({id: 1}),
                    profile({id: 3, endDate: new Date(Date.now() + day)}),
                ])], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('should reject a start date in the past', async () => {
                await expect(service.create([profilesCustomer([
                    profile({id: 1}),
                    profile({id: 3, startDate: new Date(Date.now() - day)}),
                ])], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('should reject a start date after the end date', async () => {
                await expect(service.create([profilesCustomer([
                    profile({id: 1}),
                    profile({id: 3, startDate: new Date(Date.now() + 2 * day), endDate: new Date(Date.now() + day)}),
                ])], makeSr())).rejects.toThrow(ApiErrorException)
            })

            it('should reject an unknown network', async () => {
                await expect(service.create([profilesCustomer([profile({id: 1}), profile({id: 1, networkId: 99})])], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })

            it('should reject a network of another reseller', async () => {
                await expect(service.create([profilesCustomer([profile({id: 1}), profile({id: 1, networkId: 2})])], makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })
        })

        describe('email templates', () => {
            it('should assign the reseller email templates', async () => {
                const create = jest.spyOn(customerMockRepo, 'create')
                await service.create([newCustomer({})], makeSr())
                const [entity] = create.mock.calls[0][0]
                expect(entity.subscriberEmailTemplateId).toBe(11)
                expect(entity.passresetEmailTemplateId).toBe(12)
                expect(entity.invoiceEmailTemplateId).toBe(13)
            })

            it('should keep the given email templates', async () => {
                const create = jest.spyOn(customerMockRepo, 'create')
                await service.create([newCustomer({subscriberEmailTemplateId: 14, invoiceTemplateId: 1})], makeSr())
                const [entity] = create.mock.calls[0][0]
                expect(entity.subscriberEmailTemplateId).toBe(14)
                expect(entity.invoiceTemplateId).toBe(1)
                expect(entity.passresetEmailTemplateId).toBe(12)
            })

            it.each([
                ['subscriberEmailTemplateId', 31],
                ['passresetEmailTemplateId', 1],
                ['invoiceEmailTemplateId', 999],
            ])('should reject a %s of another reseller, a default or an unknown template (%s)', async (field, id) => {
                const create = jest.spyOn(customerMockRepo, 'create')
                await expect(service.create([newCustomer({[field]: id})], makeSr()))
                    .rejects.toThrow(ApiErrorException)
                expect(create).not.toHaveBeenCalled()
            })

            it.each([2, 999])('should reject an invoiceTemplateId of another reseller or unknown (%s)', async id => {
                const create = jest.spyOn(customerMockRepo, 'create')
                await expect(service.create([newCustomer({invoiceTemplateId: id})], makeSr()))
                    .rejects.toThrow(ApiErrorException)
                expect(create).not.toHaveBeenCalled()
            })

            it('should create the missing reseller email templates from the defaults once', async () => {
                const createTemplate = jest.spyOn(customerMockRepo, 'createResellerDefaultTemplate')
                const create = jest.spyOn(customerMockRepo, 'create')
                await service.create([
                    newCustomer({contactId: 4, billingProfileId: 2}),
                    newCustomer({contactId: 4, billingProfileId: 2}),
                ], makeSr())
                expect(createTemplate.mock.calls.map(c => [c[0], c[1].name])).toEqual([
                    [2, 'subscriber_default_email'],
                    [2, 'passreset_default_email'],
                    [2, 'invoice_default_email'],
                ])
                const created = await Promise.all(createTemplate.mock.results.map(r => r.value as Promise<number>))
                for (const entity of create.mock.calls[0][0]) {
                    expect([entity.subscriberEmailTemplateId, entity.passresetEmailTemplateId, entity.invoiceEmailTemplateId])
                        .toEqual(created)
                }
            })
        })
    })

    describe('readAll', () => {
        it('should hide terminated customers by default', async () => {
            const readAll = jest.spyOn(customerMockRepo, 'readAll')
            await service.readAll(makeSr())
            expect(readAll.mock.calls[0][1]).toStrictEqual({})
        })

        it('should show terminated customers with include_terminated and drop the query param', async () => {
            const readAll = jest.spyOn(customerMockRepo, 'readAll')
            const sr = makeSr(admin, {include_terminated: true})
            await service.readAll(sr)
            expect(readAll.mock.calls[0][1]).toStrictEqual({showTerminated: true})
            expect(sr.query.include_terminated).toBeUndefined()
        })

        it('should filter by reseller for a reseller user', async () => {
            const [customers, count] = await service.readAll(makeSr(resellerUser))
            expect(count).toBeGreaterThan(0)
            expect(customers.find(c => c.contactId === 4)).toBeUndefined()
        })
    })

    describe('read', () => {
        it('should return a customer by id', async () => {
            expect(await service.read(1, makeSr())).toStrictEqual(customerMockRepo.customerDB[1])
        })

        it('should pass include_terminated as filter', async () => {
            const readById = jest.spyOn(customerMockRepo, 'readById')
            await service.read(1, makeSr(admin, {include_terminated: true}))
            expect(readById.mock.calls[0][2]).toStrictEqual({showTerminated: true})
        })

        it('should not return a customer of another reseller to a reseller user', async () => {
            await expect(service.read(2, makeSr(resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('billing profiles', () => {
        it('should filter all billing profiles by customer and reseller', async () => {
            const read = jest.spyOn(customerMockRepo, 'readAllBillingProfiles')
            const sr = makeSr(resellerUser)
            await service.readAllBillingProfiles(1, sr)
            expect(read).toHaveBeenCalledWith(1, sr, {customerId: 1, resellerId: 1})
        })

        it('should filter future billing profiles by customer only for an admin', async () => {
            const read = jest.spyOn(customerMockRepo, 'readFutureBillingProfiles')
            const sr = makeSr()
            await service.readFutureBillingProfiles(1, sr)
            expect(read).toHaveBeenCalledWith(1, sr, {customerId: 1})
        })
    })

    describe('terminate', () => {
        it('should set the status terminated and the terminate timestamp', async () => {
            const update = jest.spyOn(customerMockRepo, 'update').mockResolvedValueOnce([3])
            expect(await service.terminate([3], makeSr())).toStrictEqual([3])
            const updates = update.mock.calls[0][0]
            expect(updates[3].status).toBe(ContractStatus.Terminated)
            expect(updates[3].terminateTimestamp).toBeInstanceOf(Date)
        })

        it('should throw 404 if no customer is found', async () => {
            await expect(service.terminate([100], makeSr())).rejects.toThrow(ApiErrorException)
        })

        it('should throw 422 if some customers are not found', async () => {
            await expect(service.terminate([1, 100], makeSr())).rejects.toThrow(ApiErrorException)
        })

        it('should not terminate a customer of another reseller for a reseller user', async () => {
            await expect(service.terminate([2], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
        })
    })

    describe('delete', () => {
        it('should delete customers', async () => {
            expect(await service.delete([1, 3], makeSr())).toStrictEqual([1, 3])
        })

        it('should throw 404 if no customer is found', async () => {
            await expect(service.delete([100], makeSr())).rejects.toThrow(ApiErrorException)
        })

        it('should throw 422 if some customers are not found', async () => {
            await expect(service.delete([1, 100], makeSr())).rejects.toThrow(ApiErrorException)
        })

        it('should not delete a customer of another reseller for a reseller user', async () => {
            await expect(service.delete([1, 2], makeSr(resellerUser))).rejects.toThrow(ApiErrorException)
        })
    })

    describe('update', () => {
        const updateOf = (id: number, data: Partial<internal.Customer>): Dictionary<internal.Customer> =>
            new Dictionary<internal.Customer>(id.toString(), newCustomer({...customerMockRepo.customerDB[id], ...data}))

        it('should reject an unknown contact', async () => {
            await expect(service.update(updateOf(1, {contactId: 100}), makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject an unknown type', async () => {
            await expect(service.update(updateOf(1, {type: 'invalid' as CustomerType}), makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        it('should reject an unknown billing profile definition', async () => {
            await expect(service.update(updateOf(1, {billingProfileDefinition: 'invalid' as ContractBillingProfileDefinition}), makeSr()))
                .rejects.toThrow(ApiErrorException)
        })

        describe('templates', () => {
            it('should accept templates of the contact reseller', async () => {
                const update = jest.spyOn(customerMockRepo, 'update')
                await service.update(updateOf(1, {
                    subscriberEmailTemplateId: 14, passresetEmailTemplateId: 12, invoiceEmailTemplateId: 13, invoiceTemplateId: 1,
                }), makeSr())
                expect(update).toHaveBeenCalled()
            })

            it.each([
                ['subscriberEmailTemplateId', 31],
                ['passresetEmailTemplateId', 2],
                ['invoiceEmailTemplateId', 999],
                ['invoiceTemplateId', 2],
            ])('should reject a %s not of the contact reseller (%s)', async (field, id) => {
                const update = jest.spyOn(customerMockRepo, 'update')
                await expect(service.update(updateOf(1, {[field]: id}), makeSr()))
                    .rejects.toThrow(ApiErrorException)
                expect(update).not.toHaveBeenCalled()
            })

            it('should check the templates against the reseller of the customer contact', async () => {
                await expect(service.update(updateOf(2, {subscriberEmailTemplateId: 11}), makeSr()))
                    .rejects.toMatchObject({errorList: [{pointer: '/subscriber_email_template_id'}]})
            })
        })

        describe('id', () => {
            it('should add a mapping starting now when the billing profile changes', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                const update = jest.spyOn(customerMockRepo, 'update')
                const updates = updateOf(1, {billingProfileId: 3, profilePackageId: 1})
                expect(await service.update(updates, makeSr())).toStrictEqual([1])
                const updated = update.mock.calls[0][0][1]
                expect(updated.billingProfileId).toBeUndefined()
                expect(updated.billingProfileDefinition).toBeUndefined()
                expect(updated.profilePackageId).toBeUndefined()
                expect(updated.productId).toBe(4)
                expect(updated.modifyTimestamp).toBeInstanceOf(Date)
                const [id, mappings, now, deleteMappings] = append.mock.calls[0]
                expect(id).toBe(1)
                expect(mappings).toStrictEqual([
                    internal.BillingMapping.create({billingProfileId: 3, networkId: undefined, startDate: now, endDate: undefined}),
                ])
                expect(deleteMappings).toBe(false)
            })

            it('should not add a mapping when the billing profile is unchanged', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                await service.update(updateOf(3, {billingProfileId: 3}), makeSr())
                expect(append).not.toHaveBeenCalled()
            })

            it('should default to the id definition', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                await service.update(updateOf(3, {billingProfileDefinition: undefined, billingProfileId: 1}), makeSr())
                expect(append.mock.calls[0][1][0].billingProfileId).toBe(1)
            })

            it('should reject a billing profile of another reseller', async () => {
                await expect(service.update(updateOf(3, {billingProfileId: 2}), makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })
        })

        describe('profiles', () => {
            const profilesUpdate = (billingProfiles: internal.CustomerBillingProfile[]): Dictionary<internal.Customer> => updateOf(3, {
                billingProfileDefinition: ContractBillingProfileDefinition.Profiles,
                billingProfiles,
            })

            it('should replace the future mappings', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                const start = new Date(Date.now() + day)
                await service.update(profilesUpdate([profile({id: 3, startDate: start})]), makeSr())
                const [id, mappings, , deleteMappings] = append.mock.calls[0]
                expect(id).toBe(3)
                expect(mappings).toStrictEqual([
                    internal.BillingMapping.create({billingProfileId: 3, networkId: null, startDate: start, endDate: undefined}),
                ])
                expect(deleteMappings).toBe(true)
            })

            it('should delete the future mappings with an empty list', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                await service.update(profilesUpdate([]), makeSr())
                expect(append.mock.calls[0][1]).toStrictEqual([])
                expect(append.mock.calls[0][3]).toBe(true)
            })

            it('should reject profiles that are not an array', async () => {
                await expect(service.update(profilesUpdate(undefined), makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })

            it('should reject an open interval', async () => {
                await expect(service.update(profilesUpdate([profile({id: 3})]), makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })
        })

        describe('package', () => {
            const packageUpdate = (profilePackageId: number): Dictionary<internal.Customer> => updateOf(2, {
                contactId: 2,
                billingProfileDefinition: ContractBillingProfileDefinition.Package,
                profilePackageId,
            })

            it('should add the package mappings starting now when the package changes', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                customerMockRepo.customerDB[2].profilePackageId = 3
                await service.update(packageUpdate(1), makeSr())
                const [id, mappings, now, deleteMappings] = append.mock.calls[0]
                expect(id).toBe(2)
                expect(mappings).toStrictEqual([
                    internal.BillingMapping.create({billingProfileId: 1, networkId: undefined, startDate: now, endDate: undefined}),
                    internal.BillingMapping.create({billingProfileId: 3, networkId: 1, startDate: now, endDate: undefined}),
                ])
                expect(deleteMappings).toBe(false)
            })

            it('should keep the mappings when the package is unchanged or cleared', async () => {
                const append = jest.spyOn(customerMockRepo, 'appendBillingMappings')
                customerMockRepo.customerDB[2].profilePackageId = 1
                await service.update(packageUpdate(1), makeSr())
                await service.update(packageUpdate(null), makeSr())
                expect(append).not.toHaveBeenCalled()
            })

            it('should reject a package of another reseller', async () => {
                customerMockRepo.customerDB[2].profilePackageId = 1
                await expect(service.update(packageUpdate(2), makeSr()))
                    .rejects.toThrow(ApiErrorException)
            })
        })
    })
})
