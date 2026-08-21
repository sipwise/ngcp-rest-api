import {Test, TestingModule} from '@nestjs/testing'

import {AuthTokenMockRepository} from './repositories/token.mock.repository'
import {AuthTokenRedisRepository} from './repositories/token.redis.repository'
import {AuthTokenModule} from './token.module'
import {AuthTokenService} from './token.service'

import {AppModule} from '~/app.module'
import {AuthService} from '~/auth/auth.service'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
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

describe('AuthToken Service', () => {
    let service: AuthTokenService
    let authService: AuthService
    let mockRepo: AuthTokenMockRepository

    let sr: ServiceRequest

    beforeEach(async () => {
        mockRepo = new AuthTokenMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, AuthTokenModule],
        })
            .overrideProvider(AuthTokenRedisRepository).useValue(mockRepo)
            .compile()
        service = module.get<AuthTokenService>(AuthTokenService)
        authService = module.get<AuthService>(AuthService)

        jest.spyOn(authService, 'signAuthJwt').mockImplementation(async () => Promise.resolve({access_token: 'mocked.jwt.token'}))

        sr = {returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(mockRepo).toBeDefined()
    })

    describe('create', () => {
        it('should create a new auth token and attach the signed jwt', async () => {
            const token = new internal.AuthToken()
            token.id = 'token3'
            token.identifier = 'device3'
            token.ttl = 1800

            const result = await service.create(token, sr)
            expect(result.id).toStrictEqual(token.id)
            expect(result.identifier).toStrictEqual(token.identifier)
            expect(result.jwt).toStrictEqual('mocked.jwt.token')
            expect(await mockRepo.readById(token.id, sr)).toBeDefined()
        })
    })

    describe('readAll', () => {
        it('should return an array of auth tokens', async () => {
            const [tokens, count] = await service.readAll(sr)
            expect(tokens).toStrictEqual(await mockRepo.readAll(sr))
            expect(count).toStrictEqual(tokens.length)
        })
    })

    describe('read', () => {
        it('should return an auth token by id', async () => {
            const result = await service.read('token1', sr)
            expect(result).toStrictEqual(await mockRepo.readById('token1', sr))
        })

        it('should throw an error if id does not exist', async () => {
            await expect(service.read('non-existing-id', sr)).rejects.toThrow()
        })
    })

    describe('delete', () => {
        it('should delete auth tokens by id and return the deleted ids', async () => {
            const result = await service.delete(['token1'], sr)
            expect(result).toStrictEqual(['token1'])
            await expect(service.read('token1', sr)).rejects.toThrow()
        })

        it('should throw an error if id does not exist', async () => {
            await expect(service.delete(['non-existing-id'], sr)).rejects.toThrow()
        })
    })
})
