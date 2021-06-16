import {Model, Repository} from "sequelize-typescript";
import {BadRequestException} from "@nestjs/common";
import {CrudRepository} from "../interfaces/crud.interface";

export class CrudService<M extends Model> implements CrudRepository<M> {

    constructor(
        private repo: Repository<M>,
    ) {
    }

    async create(entity: M): Promise<M> {
        try {
            return this.repo.create<M>(entity)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async delete(id: number) {
        try {
            await this.repo.destroy({where: {id}})
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async read(page: string, row: string, id: number): Promise<M> {
        try {
            return this.repo.findOne<M>({where: {id}})
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async readAll(page: string, row: string): Promise<M[]> {
        try {
            let result = await this.repo.findAndCountAll<M>({limit: +row, offset: +row * (+page - 1)})
            return result.rows
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async update(id: number, entity: M): Promise<[number, M[]]> {
        try {
            return this.repo.update(entity, {where: {id}})
        } catch (err) {
            throw new BadRequestException(err)
        }
    }
}

