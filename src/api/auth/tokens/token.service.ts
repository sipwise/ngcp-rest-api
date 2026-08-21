import {Inject, Injectable, NotFoundException} from '@nestjs/common'

import {AuthTokenRedisRepository} from './repositories/token.redis.repository'

import {AuthService} from '~/auth/auth.service'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class AuthTokenService {
    private readonly log = new LoggerService(AuthTokenService.name)

    constructor(
        private readonly authService: AuthService,
        @Inject(AuthTokenRedisRepository) private readonly authTokenRepo: AuthTokenRedisRepository,
    ) {
    }

    async create(token: internal.AuthToken, sr: ServiceRequest): Promise<internal.AuthToken> {
        this.log.debug({
            message: 'create auth token',
            func: this.create.name,
            id: token.id,
            user: sr.user.username,
        })
        const jwt = await this.authService.signAuthJwt(token, sr.user)
        return {
            ...(await this.authTokenRepo.create(token, sr)),
            jwt: jwt.access_token,
        }
    }

    async readAll(sr: ServiceRequest): Promise<[internal.AuthToken[], number]> {
        this.log.debug({
            message: 'read all auth tokens',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const tokens = await this.authTokenRepo.readAll(sr)
        return [tokens, tokens.length]
    }

    async read(id: string, sr: ServiceRequest): Promise<internal.AuthToken> {
        this.log.debug({
            message: 'read auth token by id',
            func: this.read.name,
            id: id,
            user: sr.user.username,
        })
        const token = await this.authTokenRepo.readById(id, sr)
        if (!token)
            throw new NotFoundException()

        return token
    }

    async delete(ids: string[], sr: ServiceRequest): Promise<string[]> {
        this.log.debug({
            message: 'delete auth tokens',
            func: this.delete.name,
            ids: ids,
            user: sr.user.username,
        })
        const deletedIds: string[] = []
        for (const id of ids) {
            const token = await this.read(id, sr)
            if (token) {
                await this.authTokenRepo.delete(id, sr)
                deletedIds.push(id)
            }
        }
        return deletedIds
    }
}
