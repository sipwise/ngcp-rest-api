import {ServiceRequest} from '~/interfaces/service-request.interface'

export abstract class Repository<T> {
    abstract create(entity: T): Promise<T>

    abstract readAll(page: number, rows: number, req: ServiceRequest): Promise<T[]>

    abstract read(id: number, req: ServiceRequest): Promise<T>

    abstract update(id: number, admin: T, req: ServiceRequest): Promise<T>

    abstract delete(id: number, req: ServiceRequest): Promise<number>
}
