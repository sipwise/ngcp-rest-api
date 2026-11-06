import {NotFoundException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {EntityNotFoundError} from 'typeorm'

import {FileshareService} from './fileshare.service'

import {AppService} from '~/app.service'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {db} from '~/entities'
import {fileshare} from '~/entities/db'
import {ApiErrorException} from '~/helpers/errors.helper'
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
const ccareUser: AuthResponseDto = {...resellerUser, id: 3, role: 'ccare'}
const subscriberUser: AuthResponseDto = {...resellerUser, id: 4, role: 'subscriber'}

describe('FileshareService', () => {
    let service: FileshareService
    let limits: {quota: number, user_files: number, user_quota: number}

    const i18n = {t: jest.fn((key: string) => ({message: key, code: 0}))}

    const makeSr = (user: AuthResponseDto = admin, query: object = {}): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params: undefined,
        query: {...query},
        user,
        req: undefined,
    })

    const file = (size = 100): Express.Multer.File => ({
        mimetype: 'text/plain',
        originalname: 'a.txt',
        buffer: Buffer.from('abc'),
        size,
    } as Express.Multer.File)

    const makeQb = (rawOne?: unknown, rawMany?: unknown[]): Record<string, jest.Mock> => {
        const qb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({}),
            getRawOne: jest.fn().mockResolvedValue(rawOne),
            getRawMany: jest.fn().mockResolvedValue(rawMany),
        }
        return qb
    }

    const makeUpload = (data: Partial<fileshare.Upload>): fileshare.Upload => Object.assign(new fileshare.Upload(), {
        id: 'u1',
        original_name: 'a.txt',
        mime_type: 'text/plain',
        ttl: 60,
        size: 3,
        created_at: new Date(0),
        expires_at: new Date(60000),
        subscriber_id: 4,
        reseller_id: 1,
        ...data,
    })

    beforeEach(() => {
        limits = {quota: 0, user_files: 0, user_quota: 0}
        const app = {config: {fileshare: {limits}}} as unknown as AppService
        service = new FileshareService(app, i18n as never)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('filterOptions', () => {
        it('has no restriction for system and admin', () => {
            expect(service.filterOptions(makeSr(admin)).where).toEqual({})
            expect(service.filterOptions(makeSr({...admin, role: 'admin'})).where).toEqual({})
        })

        it.each([['reseller', resellerUser], ['ccare', ccareUser]])('filters by reseller for %s', (_role, user) => {
            expect(service.filterOptions(makeSr(user)).where).toEqual({reseller_id: 1})
        })

        it('filters by subscriber for a subscriber', () => {
            expect(service.filterOptions(makeSr(subscriberUser)).where).toEqual({subscriber_id: 4})
        })
    })

    describe('toResponse', () => {
        it('exposes subscriber_id and reseller_id to admin', () => {
            const r = service.toResponse(makeUpload({}), makeSr(admin))
            expect(r).toMatchObject({id: 'u1', name: 'a.txt', mime_type: 'text/plain', ttl: 60, size: 3, subscriber_id: 4, reseller_id: 1})
        })

        it('exposes subscriber_id but not reseller_id to reseller', () => {
            const r = service.toResponse(makeUpload({}), makeSr(resellerUser))
            expect(r.subscriber_id).toEqual(4)
            expect(r.reseller_id).toBeUndefined()
        })

        it.each([['ccare', ccareUser], ['subscriber', subscriberUser]])('exposes no owner ids to %s', (_role, user) => {
            const r = service.toResponse(makeUpload({}), makeSr(user))
            expect(r.subscriber_id).toBeUndefined()
            expect(r.reseller_id).toBeUndefined()
        })
    })

    describe('create', () => {
        let saveSpy: jest.SpyInstance

        beforeEach(() => {
            saveSpy = jest.spyOn(fileshare.Upload.prototype, 'save').mockResolvedValue(undefined)
        })

        it('stores the upload with the default ttl', async () => {
            const result = await service.create({} as never, makeSr(admin), file())
            expect(saveSpy).toHaveBeenCalledTimes(1)
            expect(result.ttl).toEqual(86400)
            expect(result.name).toEqual('a.txt')
            expect(result.mime_type).toEqual('text/plain')
            expect(result.size).toEqual(100)
            expect(result.expires_at.getTime() - result.created_at.getTime()).toEqual(86400 * 1000)
            expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
        })

        it('uses the given ttl', async () => {
            const result = await service.create({ttl: 120} as never, makeSr(admin), file())
            expect(result.ttl).toEqual(120)
            expect(result.expires_at.getTime() - result.created_at.getTime()).toEqual(120000)
        })

        it('sets the reseller and no subscriber for a reseller', async () => {
            const result = await service.create({} as never, makeSr(resellerUser), file())
            expect(result.reseller_id).toBeUndefined()
            expect(result.subscriber_id).toBeUndefined()
            expect((saveSpy.mock.instances[0] as fileshare.Upload).reseller_id).toEqual(1)
            expect((saveSpy.mock.instances[0] as fileshare.Upload).subscriber_id).toBeUndefined()
        })

        it('sets the subscriber for a subscriber', async () => {
            await service.create({} as never, makeSr(subscriberUser), file())
            expect((saveSpy.mock.instances[0] as fileshare.Upload).subscriber_id).toEqual(4)
        })

        it('does not query limits when they are disabled', async () => {
            const countSpy = jest.spyOn(db.fileshare.Upload, 'count')
            const qbSpy = jest.spyOn(db.fileshare.Upload, 'createQueryBuilder')
            await service.create({} as never, makeSr(admin), file())
            expect(countSpy).not.toHaveBeenCalled()
            expect(qbSpy).not.toHaveBeenCalled()
        })

        describe('total quota', () => {
            beforeEach(() => {
                limits.quota = 1000
            })

            it('rejects when the table size plus the file exceeds the quota', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb({size: 950}) as never)
                await expect(service.create({} as never, makeSr(admin), file(100))).rejects.toThrow(UnprocessableEntityException)
                expect(saveSpy).not.toHaveBeenCalled()
            })

            it('accepts when the quota is not exceeded', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb({size: 900}) as never)
                await service.create({} as never, makeSr(admin), file(100))
                expect(saveSpy).toHaveBeenCalled()
            })

            it('accepts when the table size is unknown', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb(undefined) as never)
                await service.create({} as never, makeSr(admin), file(100))
                expect(saveSpy).toHaveBeenCalled()
            })
        })

        describe('user files limit', () => {
            beforeEach(() => {
                limits.user_files = 2
            })

            it('rejects when the user has reached the limit and counts with the user filter', async () => {
                const countSpy = jest.spyOn(db.fileshare.Upload, 'count').mockResolvedValue(2)
                await expect(service.create({} as never, makeSr(subscriberUser), file())).rejects.toThrow(UnprocessableEntityException)
                expect(countSpy).toHaveBeenCalledWith({where: {subscriber_id: 4}})
                expect(saveSpy).not.toHaveBeenCalled()
            })

            it('accepts below the limit', async () => {
                jest.spyOn(db.fileshare.Upload, 'count').mockResolvedValue(1)
                await service.create({} as never, makeSr(subscriberUser), file())
                expect(saveSpy).toHaveBeenCalled()
            })
        })

        describe('user quota', () => {
            beforeEach(() => {
                limits.user_quota = 1000
            })

            it('rejects when the used size plus the file exceeds the quota', async () => {
                const qb = makeQb({sum: 950})
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(qb as never)
                await expect(service.create({} as never, makeSr(resellerUser), file(100))).rejects.toThrow(UnprocessableEntityException)
                expect(qb.where).toHaveBeenCalledWith({reseller_id: 1})
                expect(saveSpy).not.toHaveBeenCalled()
            })

            it('accepts when the user has no files (sum is null)', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb({sum: null}) as never)
                await service.create({} as never, makeSr(admin), file(100))
                expect(saveSpy).toHaveBeenCalled()
            })

            it('accepts exactly at the quota', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb({sum: 900}) as never)
                await service.create({} as never, makeSr(admin), file(100))
                expect(saveSpy).toHaveBeenCalled()
            })

            it('adds up a SUM() returned as a string by the driver', async () => {
                jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(makeQb({sum: '600'}) as never)
                await service.create({} as never, makeSr(admin), file(100))
                expect(saveSpy).toHaveBeenCalled()
            })
        })
    })

    describe('readAll', () => {
        it('returns the page and the total count for an admin', async () => {
            const countSpy = jest.spyOn(db.fileshare.Upload, 'count').mockResolvedValue(25)
            const findSpy = jest.spyOn(db.fileshare.Upload, 'find').mockResolvedValue([makeUpload({}), makeUpload({id: 'u2'})])
            const [result, total] = await service.readAll(makeSr(admin))
            expect(total).toEqual(25)
            expect(result.map(r => r.id)).toEqual(['u1', 'u2'])
            expect(result[0].reseller_id).toEqual(1)
            expect(countSpy).toHaveBeenCalledWith({where: {}})
            expect(findSpy).toHaveBeenCalledWith({where: {}, take: 10, skip: 0})
        })

        it('applies page and rows and the reseller filter', async () => {
            jest.spyOn(db.fileshare.Upload, 'count').mockResolvedValue(0)
            const findSpy = jest.spyOn(db.fileshare.Upload, 'find').mockResolvedValue([])
            await service.readAll(makeSr(resellerUser, {page: '3', rows: '5'}))
            expect(findSpy).toHaveBeenCalledWith({where: {reseller_id: 1}, take: 5, skip: 10})
        })

        it('filters by subscriber for a subscriber and hides owner ids', async () => {
            jest.spyOn(db.fileshare.Upload, 'count').mockResolvedValue(1)
            const findSpy = jest.spyOn(db.fileshare.Upload, 'find').mockResolvedValue([makeUpload({})])
            const [result] = await service.readAll(makeSr(subscriberUser))
            expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({where: {subscriber_id: 4}}))
            expect(result[0].subscriber_id).toBeUndefined()
        })

        it('rejects an invalid page', async () => {
            await expect(service.readAll(makeSr(admin, {page: '-1'}))).rejects.toThrow()
        })
    })

    describe('read', () => {
        it('returns a stream with the content disposition', async () => {
            const spy = jest.spyOn(db.fileshare.Upload, 'findOneByOrFail').mockResolvedValue(makeUpload({data: Buffer.from('abc')}))
            const result = await service.read('u1')
            expect(spy).toHaveBeenCalledWith({id: 'u1'})
            expect(result).toBeInstanceOf(StreamableFile)
            expect(result.getHeaders()).toEqual({
                type: 'text/plain',
                disposition: 'attachment; filename="a.txt"; size=3',
                length: 3,
            })
        })

        it('throws NotFoundException for an unknown id', async () => {
            jest.spyOn(db.fileshare.Upload, 'findOneByOrFail')
                .mockRejectedValue(new EntityNotFoundError(db.fileshare.Upload, {id: 'x'}))
            await expect(service.read('x')).rejects.toThrow(NotFoundException)
        })
    })

    describe('delete', () => {
        it('deletes the found ids', async () => {
            const selectQb = makeQb(undefined, [{fileshare_id: 'a'}, {fileshare_id: 'b'}])
            const deleteQb = makeQb()
            jest.spyOn(db.fileshare.Upload, 'createQueryBuilder')
                .mockReturnValueOnce(selectQb as never).mockReturnValueOnce(deleteQb as never)
            const result = await service.delete(['a', 'b'], makeSr(admin))
            expect(result).toEqual(['a', 'b'])
            expect(deleteQb.execute).toHaveBeenCalledTimes(1)
            expect(deleteQb.andWhere).toHaveBeenCalledWith('id IN (:...ids)', {ids: ['a', 'b']})
        })

        it('applies the owner filter for a subscriber', async () => {
            const selectQb = makeQb(undefined, [{fileshare_id: 'a'}])
            const deleteQb = makeQb()
            jest.spyOn(db.fileshare.Upload, 'createQueryBuilder')
                .mockReturnValueOnce(selectQb as never).mockReturnValueOnce(deleteQb as never)
            await service.delete(['a'], makeSr(subscriberUser))
            expect(selectQb.where).toHaveBeenCalledWith({subscriber_id: 4})
            expect(deleteQb.where).toHaveBeenCalledWith({subscriber_id: 4})
        })

        it('throws NotFoundException when none of the ids is found', async () => {
            const qb = makeQb(undefined, [])
            jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(qb as never)
            await expect(service.delete(['a'], makeSr(admin))).rejects.toThrow(ApiErrorException)
            expect(qb.execute).not.toHaveBeenCalled()
        })

        it('throws UnprocessableEntityException and deletes nothing when only some are found', async () => {
            const qb = makeQb(undefined, [{fileshare_id: 'a'}])
            const spy = jest.spyOn(db.fileshare.Upload, 'createQueryBuilder').mockReturnValue(qb as never)
            const promise = service.delete(['a', 'b'], makeSr(admin))
            await expect(promise).rejects.toThrow(ApiErrorException)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(qb.execute).not.toHaveBeenCalled()
        })
    })
})
