import {Inject, Injectable} from "@nestjs/common";
import {Connection, Entity, EntityTarget} from "typeorm";
import {config as AppConfig} from './config/main.config'

@Injectable()
export class AppService {
    constructor(
        @Inject('DB') private readonly defaultDatabase: Connection,
    ) {
    }
    static config = AppConfig
    public config = AppConfig
    public db = this.defaultDatabase
    public dbRepo<Entity>(target: EntityTarget<Entity>) {
        return this.defaultDatabase.getRepository(target)
    }
}