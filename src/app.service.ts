import {Inject, Injectable} from '@nestjs/common'
import {DataSource, EntityTarget} from 'typeorm'
import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    static config = AppConfig
    public config = AppConfig
    public db = this.defaultDatabase

    private dbAvailable = true

    constructor(
        @Inject('DB') private readonly defaultDatabase: DataSource,
    ) {
    }

    get isDbInitialised() {
        return this.db.isInitialized
    }

    get isDbAvailable() {
        return this.dbAvailable
    }

    set setDbAvailable(dbAvailable: boolean) {
        this.dbAvailable = dbAvailable
    }

    public dbConnection() {
        return this.db.manager
    }

    public dbRepo<Entity>(target: EntityTarget<Entity>) {
        return this.dbConnection().getRepository(target)
    }
}
