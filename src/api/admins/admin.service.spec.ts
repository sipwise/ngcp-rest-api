import {ForbiddenException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {AdminModule} from './admin.module'
import {AdminService} from './admin.service'
import {AdminRequestDto} from './dto/admin-request.dto'
import {AdminOptions} from './interfaces/admin-options.interface'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {AdminPasswordJournalMockRepository} from './repositories/admin-password-journal.mock.repository'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'
import {AdminMockRepository} from './repositories/admin.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {deepCopy} from '~/helpers/deep-copy.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {AclRoleMockRepository} from '~/repositories/acl-role.mock.repository'
import {AclRoleRepository} from '~/repositories/acl-role.repository'

const role_data = internal.AclRole.create({
    has_access_to: [
        internal.AclRole.create({id: 2}),
    ], id: 1,
})

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    role_data: role_data,
    username: 'administrator',
}
describe('AdminService', () => {
    let service: AdminService
    let adminMockRepo: AdminMockRepository
    let adminPasswordJournalMockRepo: AdminPasswordJournalMockRepository
    const aclRoleMockRepo: AclRoleMockRepository = new AclRoleMockRepository()

    let sr: ServiceRequest
    let options: AdminOptions

    beforeEach(async () => {
        adminMockRepo = new AdminMockRepository()
        adminPasswordJournalMockRepo = new AdminPasswordJournalMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, AdminModule, ExpandModule],
        })
            .overrideProvider(AclRoleRepository).useValue(aclRoleMockRepo)
            .overrideProvider(AdminMariadbRepository).useValue(adminMockRepo)
            .overrideProvider(AdminPasswordJournalMariadbRepository).useValue(adminPasswordJournalMockRepo)
            .compile()
        service = module.get<AdminService>(AdminService)
        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(adminMockRepo).toBeDefined()
    })

    it('mock service.getAdminOptionsFromServiceRequest', () => {
        jest.spyOn(service, 'getAdminOptionsFromServiceRequest').mockImplementation(() => {
            return {isMaster: true, hasAccessTo: [1], filterBy: {userId: 1}}
        })
        expect(service.getAdminOptionsFromServiceRequest({
            headers: undefined,
            params: undefined,
            req: undefined,
            returnContent: false,
            user: undefined,
        })).toStrictEqual({isMaster: true, hasAccessTo: [1], filterBy: {userId: 1}})
    })

    describe('readAll', () => {
        it('should return an array of admins', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await adminMockRepo.readAll(options, sr))
        })
    })

    describe('read', () => {
        it('should return an admin by id', async () => {
            const result = await service.read(2, sr)
            expect(result).toStrictEqual(await adminMockRepo.readById(2, options))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('should return a valid admin', async () => {
            const result = await service.create([internal.Admin.create({login: 'jest', role: 'admin'})], sr)
            expect(result[0]).toStrictEqual(await adminMockRepo.readById(result[0].id, options))
        })

        it('should return access forbidden', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            await expect(service.create([internal.Admin.create({
                login: 'jest',
                role: 'admin',
            })], localRequest)).rejects.toThrow(ForbiddenException)
        })

        it('should set reseller_id if not set', async () => {
            const got = (await service.create([internal.Admin.create({login: 'jest', role: 'admin'})], sr))[0]
            const want = await adminMockRepo.readById(got.id, options)
            expect(got.id).toStrictEqual(want.id)
            expect(got.reseller_id).toStrictEqual(sr.user.reseller_id)
        })

        it('should set reseller_id if user is restricted to reseller_id', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.reseller_id_required = true

            const got = (await service.create([internal.Admin.create({
                login: 'jest',
                role: 'admin',
                reseller_id: 100,
            })], localRequest))[0]
            const want = await adminMockRepo.readById(got.id, options)
            expect(want).toStrictEqual(got)
            expect(want.reseller_id).toStrictEqual(sr.user.reseller_id)
        })

        it('should allow setting different reseller_id of not restricted', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.reseller_id_required = false

            const got = (await service.create([internal.Admin.create({
                login: 'jest',
                role: 'admin',
                reseller_id: 100,
            })], localRequest))[0]
            const want = await adminMockRepo.readById(got.id, options)
            expect(want).toStrictEqual(got)
        })

        it('should generate hashed password if password is set', async () => {
            const got = (await service.create([internal.Admin.create({
                login: 'jest',
                role: 'admin',
                password: 'secret',
            })], sr))[0]
            const want = await adminMockRepo.readById(got.id, options)
            expect(got).toStrictEqual(want)
            expect(got.saltedpass).toBeDefined()
        })
    })

    describe('update', () => {
        it('should update admin by id', async () => {
            const id = 2
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({login: 'jest', role: 'admin'})
            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)
            const want = await adminMockRepo.readById(id, options)
            expect(got).toStrictEqual(want)
        })

        it('should set correct id', async () => {
            const id = 2
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({login: 'jest', role: 'admin', id: 3})
            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)
            const want = await adminMockRepo.readById(id, options)
            expect(got).toStrictEqual(want)
            expect(got.id).toStrictEqual(id)
        })

        it('should throw ForbiddenException with wrong permissions', async () => {
            const id = 2
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({login: 'jest', role: 'admin'})
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            await expect(service.update(updates, localRequest)).rejects.toThrow(ForbiddenException)
        })

        const protectedFields = internal.Admin.create({
            billing_data: false,
            call_data: false,
            is_active: false,
            is_master: false,
            is_superuser: false,
            is_system: false,
            lawful_intercept: false,
            login: 'protectedJest',
            role: 'reseller',
            show_passwords: false,
        })
        Object.keys(protectedFields).map(s => {
            it(`should throw ForbiddenException when updating ${s} on self`, async () => {
                const id = 1
                const updates = new Dictionary<internal.Admin>()
                const admin = internal.Admin.create({id: 1, role: 'admin'})
                admin[s] = protectedFields[s]
                updates[id] = admin
                await expect(service.update(updates, sr)).rejects.toThrow(ForbiddenException)
            })
        })

        it('should update password if password is set', async () => {
            const id = 2
            const old = await adminMockRepo.readById(id, options)
            const oldPass = old.saltedpass
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({
                login: 'jest',
                role: 'admin',
                password: 'supersecret',
            })
            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)
            const want = await adminMockRepo.readById(id, options)
            expect(got).toStrictEqual(want)
            expect(got.saltedpass).not.toStrictEqual(oldPass)
        })

        it('should not update password if it was previously set', async () => {
            const id = 2
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({
                login: 'jest',
                role: 'admin',
                password: 'supersecret1',
            })
            await service.update(updates, sr) // this will set the password to a new value
            await expect(service.update(updates, sr)).rejects.toThrow() // this will try to set the password to the same value
        })

        it('should throw an error if ID does not exist', async () => {
            const id = 100
            const updates = new Dictionary<internal.Admin>()
            updates[id] = internal.Admin.create({})
            await expect(service.update(updates, sr)).rejects.toThrow()
        })

        it('should not replace the whole object if the password is the same', async () => {
            const created = (await service.create([internal.Admin.create({
                billing_data: true,
                call_data: true,
                can_reset_password: true,
                email: 'jester@example.com',
                is_active: true,
                is_master: false,
                login: 'jester',
                read_only: false,
                reseller_id: 4,
                password: 'supersecret',
                role: 'reseller',
                show_passwords: true,
            })], sr))[0]

            const updates = new Dictionary<internal.Admin>()

            updates[created.id] = internal.Admin.create({
                billing_data: false,
                call_data: false,
                can_reset_password: false,
                is_active: false,
                is_master: true,
                login: 'anotherjester',
                password: 'supersecret',
                read_only: true,
                reseller_id: 2,
                role: 'reseller',
                show_passwords: false,
            })

            await expect(service.update(updates, sr)).rejects.toThrow()
        })

        it('should replace the whole object', async () => {
            const created = (await service.create([internal.Admin.create({
                billing_data: true,
                call_data: true,
                can_reset_password: true,
                email: 'jester@example.com',
                is_active: true,
                is_master: false,
                login: 'jester',
                read_only: false,
                reseller_id: 4,
                password: 'supersecret1',
                role: 'reseller',
                show_passwords: true,
            })], sr))[0]

            const updates = new Dictionary<internal.Admin>()

            updates[created.id] = internal.Admin.create({
                billing_data: false,
                call_data: false,
                can_reset_password: false,
                is_active: false,
                is_master: true,
                login: 'anotherjester',
                password: 'supersecret',
                read_only: true,
                reseller_id: 2,
                role: 'reseller',
                show_passwords: false,
            })

            const ids = await service.update(updates, sr)
            const got = await service.read(ids[0], sr)

            expect(got.id).toStrictEqual(created.id)
            expect(got.billing_data).not.toStrictEqual(created.billing_data)
            expect(got.call_data).not.toStrictEqual(created.call_data)
            expect(got.can_reset_password).not.toStrictEqual(created.can_reset_password)
            expect(got.email).not.toStrictEqual(created.email)
            expect(got.is_active).not.toStrictEqual(created.is_active)
            expect(got.is_master).not.toStrictEqual(created.is_master)
            expect(got.login).not.toStrictEqual(created.login)
            expect(got.saltedpass).not.toStrictEqual(created.saltedpass)
            expect(got.read_only).not.toStrictEqual(created.read_only)
            expect(got.reseller_id).not.toStrictEqual(created.reseller_id)
            expect(got.show_passwords).not.toStrictEqual(created.show_passwords)
        })
    })

    describe('adjust', () => {
        it('should update role to admin', async () => {
            const id = 3
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/role', value: RbacRole.admin},
            ]

            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Admin, AdminRequestDto>(oldEntity, patch, AdminRequestDto)
            const update = new Dictionary<internal.Admin>(id.toString(), entity)

            const got = await service.update(update, sr)
            expect(got[0] == id)
            const admin = await service.read(id, sr)
            expect(admin.role).toStrictEqual(RbacRole.admin)
        })
        it('throw ForbiddenException with wrong permissions', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/role', value: 'system'},
            ]
            const oldEntity = await service.read(id, sr)
            const entity = await patchToEntity<internal.Admin, AdminRequestDto>(oldEntity, patch, AdminRequestDto)
            const update = new Dictionary<internal.Admin>(id.toString(), entity)
            await expect(service.update(update, localRequest)).rejects.toThrow(ForbiddenException)
        })
        const protectedFields = internal.Admin.create({
            billing_data: true,
            call_data: true,
            is_active: true,
            is_master: true,
            is_superuser: false,
            is_system: true,
            lawful_intercept: true,
            login: 'protectedJest',
            role: 'reseller',
            show_passwords: false,
        })
        Object.keys(protectedFields).map(s => {
            it(`should throw ForbiddenException when updating ${s} on self`, async () => {
                const id = 1
                const patch: PatchOperation[] = [
                    {op: 'replace', path: `/${s}`, value: protectedFields[s]},
                ]
                const oldEntity = await service.read(id, sr)
                const entity = await patchToEntity<internal.Admin, AdminRequestDto>(oldEntity, patch, AdminRequestDto)
                const update = new Dictionary<internal.Admin>(id.toString(), entity)
                await expect(service.update(update, sr)).rejects.toThrow(ForbiddenException)
            })
        })
    })

    describe('delete', () => {
        it('should not allow deleting self', async () => {
            const id = 1
            await expect(service.delete([id], sr)).rejects.toThrow(ForbiddenException)
        })

        it('should return number of deleted items', async () => {
            const id = 2
            await service.delete([id], sr)
            // expect(result).toStrictEqual(1)
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.delete([id], sr)).rejects.toThrow()
        })
    })
})
