import {NotFoundException} from '@nestjs/common'

import {AuthTokenRepository} from '~/api/auth/tokens/interfaces/token.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface AuthTokenMockDB {
    [key: string]: internal.AuthToken
}

export class AuthTokenMockRepository implements AuthTokenRepository {

    private readonly db: AuthTokenMockDB

    constructor() {
        this.db = {
            'token1': {id: 'token1', identifier: 'device1', ttl: 3600, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T01:00:00.000Z'},
            'token2': {id: 'token2', identifier: 'device2', ttl: 7200, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T02:00:00.000Z'},
        }
    }

    async create(token: internal.AuthToken, _sr: ServiceRequest): Promise<internal.AuthToken> {
        this.db[token.id] = token
        return Promise.resolve(this.db[token.id])
    }

    async readAll(_sr: ServiceRequest): Promise<internal.AuthToken[]> {
        return Promise.resolve(Object.keys(this.db).map(id => this.db[id]))
    }

    async readById(id: string, _sr: ServiceRequest): Promise<internal.AuthToken> {
        return Promise.resolve(this.db[id])
    }

    async delete(id: string, _sr: ServiceRequest): Promise<string> {
        this.throwErrorIfIdNotExists(id)
        delete this.db[id]
        return Promise.resolve(id)
    }

    private throwErrorIfIdNotExists(id: string): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
