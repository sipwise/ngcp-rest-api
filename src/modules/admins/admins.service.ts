import { Inject, Injectable, Req } from "@nestjs/common";
import { ADMIN_REPOSITORY } from "src/core/constants";
import { Admin } from "./admin.entity";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { Request, Response } from "express";
import { UpdateAdminDto } from "./dto/update-admin.dto";

@Injectable()
export class AdminsService {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: typeof Admin
    ){}


    async create(admin: CreateAdminDto): Promise<Admin> {
        return await this.adminRepository.create<Admin>(admin);
    }

    //async findAll(req: Request, res: Response, page?: number, rows?: number): Promise<Admin[]> {
    async findAll(page?: number, rows?: number): Promise<Admin[]> {
                return await this.adminRepository.findAll<Admin>();
    }

    async findOne(id: number): Promise<Admin> {
        return await this.adminRepository.findOne<Admin>({ where: { id }});
    }

    async findOneByLogin(login: string): Promise<Admin> {
        return await this.adminRepository.findOne<Admin>({where: {login}});
    }

    async update(id: number, admin: UpdateAdminDto): Promise<[number, Admin[]]> {
        return await this.adminRepository.update<Admin>(admin, {where: { id }});
    }

    async remove(id: number) {
        return await this.adminRepository.destroy({where: { id }});
    }
}