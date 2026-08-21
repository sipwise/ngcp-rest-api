import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface AuthTokenRepository {
    create(token: internal.AuthToken, sr: ServiceRequest): Promise<internal.AuthToken>

    readAll(sr: ServiceRequest): Promise<internal.AuthToken[]>

    readById(id: string, sr: ServiceRequest): Promise<internal.AuthToken>

    delete (id: string, sr: ServiceRequest): Promise<string>
}
