import {ForbiddenException, UnauthorizedException} from '@nestjs/common'

import {AuthService} from './auth.service'
import {CertStrategy} from './cert.strategy'

import {AppService} from '~/app.service'
import {db} from '~/entities'

describe('admin certificate authentication', () => {
    let adminRepo: {findOne: jest.Mock}
    let roleRepo: {findOne: jest.Mock}
    let service: AuthService

    const admin = (data: Partial<db.billing.Admin>): db.billing.Admin => Object.assign(new db.billing.Admin(), {
        id: 3,
        login: 'certadmin',
        is_active: true,
        role: Object.assign(new db.billing.AclRole(), {id: 1, role: 'system', is_acl: false}),
        ...data,
    })

    beforeEach(() => {
        adminRepo = {findOne: jest.fn()}
        roleRepo = {findOne: jest.fn()}
        const app = {dbRepo: jest.fn(entity => entity === db.billing.Admin ? adminRepo : roleRepo)}
        service = new AuthService(app as unknown as AppService, undefined, undefined)
    })

    it('returns null for an unknown serial without a role lookup', async () => {
        adminRepo.findOne.mockResolvedValue(null)
        await expect(service.validateAdminCert('1a2b')).resolves.toBeNull()
        expect(adminRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({where: {ssl_client_m_serial: 0x1a2b}}))
        expect(roleRepo.findOne).not.toHaveBeenCalled()
    })

    it('returns null for an unparsable serial', async () => {
        await expect(service.validateAdminCert('zz')).resolves.toBeNull()
        expect(adminRepo.findOne).not.toHaveBeenCalled()
    })

    it('returns the admin for a known serial', async () => {
        adminRepo.findOne.mockResolvedValue(admin({}))
        roleRepo.findOne.mockResolvedValue(Object.assign(new db.billing.AclRole(), {id: 1, role: 'system', is_acl: false, has_access_to: []}))
        const user = await service.validateAdminCert('1a2b')
        expect(user).toEqual(expect.objectContaining({id: 3, username: 'certadmin', role: 'system', active: true}))
    })

    it('rejects an inactive admin with 403', async () => {
        adminRepo.findOne.mockResolvedValue(admin({is_active: false}))
        roleRepo.findOne.mockResolvedValue(Object.assign(new db.billing.AclRole(), {id: 1, role: 'system', is_acl: false}))
        await expect(service.validateAdminCert('1a2b')).rejects.toThrow(ForbiddenException)
    })

    it('cert strategy rejects an unknown serial with 401', async () => {
        adminRepo.findOne.mockResolvedValue(null)
        const strategy = new CertStrategy(service)
        await expect(strategy.validate('1a2b')).rejects.toThrow(UnauthorizedException)
    })
})
