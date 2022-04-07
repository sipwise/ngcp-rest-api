import {Test, TestingModule} from '@nestjs/testing'
import {AdminsService} from './admins.service'
import {AdminsModule} from './admins.module'
import {ExpandModule} from '../../helpers/expand.module'
import {AdminsMariadbRepository} from './repositories/admins.mariadb.repository'
import {AppModule} from '../../app.module'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {internal} from '../../entities'
import {AclRoleMockRepository, deepCopy} from '../../repositories/acl-role.mock.repository'
import {AclRoleRepository} from '../../repositories/acl-role.repository'
import {RepositoriesModule} from '../../repositories/repositories.module'
import {ForbiddenException, UnprocessableEntityException} from '@nestjs/common'
import {AdminsMockRepository} from './repositories/admins.mock.repository'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {RBAC_ROLES} from '../../config/constants.config'

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

describe('AdminsService', () => {
    let service: AdminsService
    let adminsMockRepo: AdminsMockRepository
    const aclRoleMockRepo: AclRoleMockRepository = new AclRoleMockRepository()

    let sr: ServiceRequest

    beforeEach(async () => {
        adminsMockRepo = new AdminsMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AdminsModule, ExpandModule, AppModule, RepositoriesModule],
        })
            .overrideProvider(AclRoleRepository).useValue(aclRoleMockRepo)
            .overrideProvider(AdminsMariadbRepository).useValue(adminsMockRepo)
            .compile()

        service = module.get<AdminsService>(AdminsService)
        sr = {headers: [undefined], params: [undefined], query: undefined, user: user}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(adminsMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of admins', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await adminsMockRepo.readAll(sr))
        })
    })

    describe('read', () => {
        it('should return an admin by id', async () => {
            const result = await service.read(2, sr)
            expect(result).toStrictEqual(await adminsMockRepo.readById(2, sr))
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.read(id, sr)).rejects.toThrow()
        })
    })

    describe('create', () => {
        it('should return a valid admin', async () => {
            const result = await service.create(internal.Admin.create({login: 'jest', role: 'admin'}), sr)
            expect(result).toStrictEqual(await adminsMockRepo.readById(result.id, sr))
        })

        it('should return access forbidden', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            await expect(service.create(internal.Admin.create({
                login: 'jest',
                role: 'admin',
            }), localRequest)).rejects.toThrow(ForbiddenException)
        })

        it('should set reseller_id if not set', async () => {
            const got = await service.create(internal.Admin.create({login: 'jest', role: 'admin'}), sr)
            const want = await adminsMockRepo.readById(got.id, sr)
            expect(got.id).toStrictEqual(want.id)
            expect(got.reseller_id).toStrictEqual(sr.user.reseller_id)
        })

        it('should set reseller_id if user is restricted to reseller_id', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.reseller_id_required = true

            const got = await service.create(internal.Admin.create({
                login: 'jest',
                role: 'admin',
                reseller_id: 100,
            }), localRequest)
            const want = await adminsMockRepo.readById(got.id, sr)
            expect(want).toStrictEqual(got)
            expect(want.reseller_id).toStrictEqual(sr.user.reseller_id)
        })

        it('should allow setting different reseller_id of not restricted', async () => {
            const localRequest = deepCopy(sr)
            localRequest.user.reseller_id_required = false

            const got = await service.create(internal.Admin.create({
                login: 'jest',
                role: 'admin',
                reseller_id: 100,
            }), localRequest)
            const want = await adminsMockRepo.readById(got.id, sr)
            expect(want).toStrictEqual(got)
        })

        it('should generate hashed password if password is set', async () => {
            const got = await service.create(internal.Admin.create({
                login: 'jest',
                role: 'admin',
                password: 'secret',
            }), sr)
            const want = await adminsMockRepo.readById(got.id, sr)
            expect(got).toStrictEqual(want)
            expect(got.saltedpass).toBeDefined()
        })
    })

    describe('update', () => {
        it('should update admin by id', async () => {
            const id = 2
            const got = await service.update(id, internal.Admin.create({login: 'jest', role: 'admin'}), sr)
            const want = await adminsMockRepo.readById(id, sr)
            expect(got).toStrictEqual(want)
        })

        it('should set correct id', async () => {
            const id = 2
            const got = await service.update(id, internal.Admin.create({login: 'jest', role: 'admin', id: 3}), sr)
            const want = await adminsMockRepo.readById(id, sr)
            expect(got).toStrictEqual(want)
            expect(got.id).toStrictEqual(id)
        })

        it('should throw ForbiddenException with wrong permissions', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            await expect(service.update(id, internal.Admin.create({
                login: 'jest',
                role: 'admin',
            }), localRequest)).rejects.toThrow(ForbiddenException)
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
                const admin = internal.Admin.create({id: 1, role: 'admin'})
                admin[s] = protectedFields[s]
                await expect(service.update(id, admin, sr)).rejects.toThrow(ForbiddenException)
            })
        })

        it('should update password if password is set', async () => {
            const id = 2
            const old = await adminsMockRepo.readById(id, sr)
            const oldPass = old.saltedpass
            const got = await service.update(id, internal.Admin.create({
                login: 'jest',
                role: 'admin',
                password: 'supersecret',
            }), sr)
            const want = await adminsMockRepo.readById(id, sr)
            expect(got).toStrictEqual(want)
            expect(got.saltedpass).not.toStrictEqual(oldPass)
        })

        it('should throw an error if ID does not exist', async () => {
            const id = 100
            await expect(service.update(id, internal.Admin.create({}), sr)).rejects.toThrow()
        })

        it('should replace the whole object', async () => {
            const created = await service.create(internal.Admin.create({
                billing_data: true,
                call_data: true,
                can_reset_password: true,
                email: 'jester@example.com',
                is_active: true,
                is_master: false,
                login: 'jester',
                password: 'supersecret',
                read_only: false,
                reseller_id: 4,
                role: 'reseller',
                show_passwords: true,
            }), sr)
            const got = await service.update(created.id, internal.Admin.create({
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
            }), sr)
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

    describe('adjust', () =>  {
        it('should update role to admin', async () => {
            const id = 3
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/role', value: RBAC_ROLES.admin},
            ]
            const got = await service.adjust(id, patch, sr)
            const want = await adminsMockRepo.readById(id, sr)
            expect(got.role).toStrictEqual(RBAC_ROLES.admin)
        })
        it('throw ForbiddenException with wrong permissions', async () => {
            const id = 2
            const localRequest = deepCopy(sr)
            localRequest.user.role = 'reseller'
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/role', value: 'system'},
            ]
            await expect(service.adjust(id, patch, localRequest)).rejects.toThrow(ForbiddenException)
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
                    {op: 'replace', path:`/${s}`, value: protectedFields[s]},
                ]
                await expect(service.adjust(id, patch, sr)).rejects.toThrow(ForbiddenException)
            })
        })
    })

    describe('delete', () => {
        it('should not allow deleting self', async () => {
            const id = 1
            await expect(service.delete(id, sr)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should return number of deleted items', async () => {
            const id = 2
            const result = await service.delete(id, sr)
            expect(result).toStrictEqual(1)
        })

        it('should throw an error if id does not exist', async () => {
            const id = 100
            await expect(service.delete(id, sr)).rejects.toThrow()
        })
    })
})
