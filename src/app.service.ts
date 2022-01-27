import {Inject, Injectable} from '@nestjs/common'
import {ConnectionManager, EntityTarget} from 'typeorm'
import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    static config = AppConfig
    public config = AppConfig
    public db = this.defaultDatabase

    private dbAvailable = true

    constructor(
        @Inject('DB') private readonly defaultDatabase: ConnectionManager,
    ) {
    }

    get isDbInitialised() {
        return this.dbConnection().isConnected
    }

    get isDbAvailable() {
        return this.dbAvailable
    }

    set setDbAvailable(dbAvailable: boolean) {
        this.dbAvailable = dbAvailable
    }

    public dbConnection() {
        return this.defaultDatabase.get()
    }

    public dbRepo<Entity>(target: EntityTarget<Entity>) {
        return this.dbConnection().getRepository(target)
    }
}
