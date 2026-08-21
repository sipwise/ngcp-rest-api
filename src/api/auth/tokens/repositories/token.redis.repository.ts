import {Injectable} from '@nestjs/common'
import Redis, {Cluster} from 'ioredis'

import {AuthTokenRepository} from '~/api/auth/tokens/interfaces/token.repository'
import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {RedisDatabases} from '~/config/redis.config'
import {HandleRedisErrors} from '~/decorators/handle-redis-errors.decorator'
import {internal} from '~/entities'
import {findKeys} from '~/helpers/redis.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const keyPrefix = 'auth_tokens'

@Injectable()
export class AuthTokenRedisRepository implements AuthTokenRepository {
    private readonly log = new LoggerService(AuthTokenRedisRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleRedisErrors
    async create(token: internal.AuthToken, sr: ServiceRequest): Promise<internal.AuthToken> {
        const redis = await this.getRedisDb()
        const key = this.buildKey(token.id, sr)

        token.createdAt = new Date().toISOString()
        token.expiresAt = new Date(Date.now() + token.ttl * 1000).toISOString()

        await redis.hset(key, {
            id: token.id,
            identifier: token.identifier,
            created_at: token.createdAt,
            expires_at: token.expiresAt,
            ttl: token.ttl,
        })

        if (token.ttl > 0) {
            await redis.expire(key, token.ttl)
        }

        return token
    }

    @HandleRedisErrors
    async readAll(sr: ServiceRequest): Promise<internal.AuthToken[]> {
        this.log.debug({
            message: 'read all auth tokens from redis',
            func: this.readAll.name,
        })
        const redis = await this.getRedisDb()

        const pattern = this.buildSearchKey('*', sr)

        const keys = await findKeys(redis, pattern)

        const tokens: internal.AuthToken[] = []
        for (const key of keys) {
            const token = await this.readByKey(redis, key)
            if (token)
                tokens.push(token)
        }
        return tokens
    }

    @HandleRedisErrors
    async readById(id: string, sr: ServiceRequest): Promise<internal.AuthToken> {
        this.log.debug({
            message: 'read auth token by id from redis',
            func: this.readById.name,
            id: id,
        })
        const redis = await this.getRedisDb()
        const pattern = this.buildSearchKey(id, sr)
        const keys = await findKeys(redis, pattern, 1)
        if (!keys.length)
            return undefined

        return await this.readByKey(redis, keys[0])
    }

    @HandleRedisErrors
    async delete(id: string, _sr: ServiceRequest): Promise<string> {
        this.log.debug({
            message: 'delete auth token from redis',
            func: this.delete.name,
            id: id,
        })
        const redis = await this.getRedisDb()
        const keys = await findKeys(redis, `${keyPrefix}::id:${id}::*`, 1)
        if (keys.length)
            await redis.del(keys[0])

        return id
    }

    private async getRedisDb(): Promise<Redis | Cluster> {
        const redis = this.app.redis
        await redis.select(RedisDatabases.session)
        return redis
    }

    private buildKey(id: string, sr: ServiceRequest): string {
        return `${keyPrefix}::id:${id}::username:${sr.user.username}::reseller:${sr.user.reseller_id}`
    }

    private buildSearchKey(id: string, sr: ServiceRequest): string {
        let usernameFilter = '*'
        if (sr.user.role == RbacRole.subscriber || sr.user.role == RbacRole.subscriberadmin) {
            usernameFilter = sr.user.username
        }
        let resellerFilter = '*'
        if (sr.user.reseller_id_required) {
            resellerFilter = sr.user.reseller_id
        }
        return `${keyPrefix}::id:${id}::username:${usernameFilter}::reseller:${resellerFilter}`
    }

    private async readByKey(redis: Redis | Cluster, key: string): Promise<internal.AuthToken | undefined> {
        const data = await redis.hgetall(key)
        if (!data || !data.id)
            return undefined

        return {
            id: data.id,
            identifier: data.identifier,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
            ttl: +data.ttl,
        }
    }
}
