import {Inject, Injectable, Logger} from '@nestjs/common'
import {DataSource, EntityTarget} from 'typeorm'
import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    static readonly config = AppConfig
    public readonly config = AppConfig
    public readonly db: DataSource

    private dbAvailable = true

    constructor(
        @Inject(Logger) private readonly defaultLogger: Logger,
        @Inject('DB') private readonly defaultDatabase: DataSource,
    ) {
        this.db = defaultDatabase
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

    public logger() {
        return this.defaultLogger
    }
}
