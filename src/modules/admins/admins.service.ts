import {Inject, Injectable} from '@nestjs/common'
import {ADMIN_REPOSITORY} from 'core/constants'
import {Admin} from './admin.entity'
import {CreateAdminDto} from './dto/create-admin.dto'
import {UpdateAdminDto} from './dto/update-admin.dto'

@Injectable()
export class AdminsService {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: typeof Admin,
    ) {
    }


    async create(admin: CreateAdminDto): Promise<Admin> {
        return this.adminRepository.create<Admin>(admin)
    }

    async findAll(page?: string, rows?: string): Promise<Admin[]> {
        let result = await this.adminRepository.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
        return result.rows
    }

    async findOne(id: number): Promise<Admin> {
        return this.adminRepository.findOne<Admin>({where: {id}})
    }

    async findOneByLogin(login: string): Promise<Admin> {
        return this.adminRepository.findOne<Admin>({where: {login}})
    }

    async update(id: number, admin: UpdateAdminDto): Promise<[number, Admin[]]> {
        return this.adminRepository.update<Admin>(admin, {where: {id}})
    }

    async remove(id: number) {
        return this.adminRepository.destroy({where: {id}})
    }

    async searchOne(pattern: {}): Promise<Admin> {
        return this.adminRepository.findOne(pattern)
    }
}
