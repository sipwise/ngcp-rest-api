import {Inject, Injectable} from '@nestjs/common'
import {Connection, EntityTarget} from 'typeorm'
import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    static config = AppConfig
    public config = AppConfig
    public db = this.defaultDatabase

    constructor(
        @Inject('DB') private readonly defaultDatabase: Connection,
    ) {
    }

    public dbRepo<Entity>(target: EntityTarget<Entity>) {
        return this.defaultDatabase.getRepository(target)
    }
}
