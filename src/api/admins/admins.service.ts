import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common'
import {ADMIN_REPOSITORY} from '../../config/constants.config'
import {Admin, AdminDbAttributes} from '../../entities/db/billing/admin.entity'
import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {genSalt, hash} from 'bcrypt'
import {AdminResponseDto} from './dto/admin-response.dto'
import {handleSequelizeError} from '../../helpers/errors.helper'
import {CrudService} from '../../interfaces/crud-service.interface'
import { applyPatch, Operation as PatchOperation } from 'fast-json-patch'

@Injectable()
export class AdminsService implements CrudService<AdminCreateDto, AdminResponseDto> {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: typeof Admin,
    ) {
    }

    private inflate(dto: AdminBaseDto): Admin {
            return Object.assign(dto)
    }

    private deflate(entry: Admin): AdminBaseDto {
            return Object.assign(entry)
    }

    private toResponse(db: Admin): AdminResponseDto {
        return {
            billing_data: db.billing_data,
            call_data: db.call_data,
            can_reset_password: db.can_reset_password,
            email: db.email,
            id: db.id,
            is_active: db.is_active,
            is_ccare: db.is_ccare,
            is_master: db.is_master,
            is_superuser: db.is_superuser,
            is_system: db.is_system,
            lawful_intercept: db.lawful_intercept,
            login: db.login,
            read_only: db.read_only,
            reseller_id: db.reseller_id,
            show_passwords: db.show_passwords,
        }
    }

    async create(admin: AdminCreateDto): Promise<AdminResponseDto> {
        let dbAdmin: AdminDbAttributes = {
            billing_data: admin.billing_data,
            call_data: admin.call_data,
            can_reset_password: admin.can_reset_password,
            email: admin.email,
            is_active: admin.is_active,
            is_ccare: admin.is_ccare,
            is_master: admin.is_master,
            is_superuser: admin.is_superuser,
            is_system: admin.is_system,
            lawful_intercept: admin.lawful_intercept,
            login: admin.login,
            read_only: admin.read_only,
            reseller_id: admin.reseller_id,
            show_passwords: admin.show_passwords,
        }
        const bcrypt_version = 'b'
        const bcrypt_cost = 13

        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(admin.password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        dbAdmin.saltedpass = b64salt + "$" + b64hash
        try {
            return this.toResponse(await this.adminRepository.create<Admin>(dbAdmin))
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async readAll(page?: string, rows?: string): Promise<AdminResponseDto[]> {
        try {
            const result = await this.adminRepository.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
            return result.rows.map(adm => this.toResponse(adm))
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async read(id: number): Promise<AdminResponseDto> {
        let entry: Admin
        try {
            entry = await this.adminRepository.findOne<Admin>({where: {id}})
        } catch(err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
            throw new NotFoundException()

        try {
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async readOneByLogin(login: string): Promise<AdminResponseDto> {
        try {
            return this.toResponse(await this.adminRepository.findOne<Admin>({where: {login}}))
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async update(id: number, admin: AdminUpdateDto): Promise<AdminResponseDto> {
        let entry: Admin
        try {
            entry = await this.adminRepository.findByPk(id)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
            throw new NotFoundException()

        try {
            entry.set(admin)
            entry.save()
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async adjust(id: number, patch: PatchOperation[]): Promise<AdminResponseDto> {
        let entry: Admin
        let admin: AdminBaseDto

        try {
            entry = await this.adminRepository.findByPk(id)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        if (!entry)
            throw new NotFoundException()

        try {
            admin = this.deflate(entry)
            admin = applyPatch(admin, patch).newDocument
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }

        try {
            entry.set(this.inflate(admin))
            entry.save()
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async delete(id: number) {
        try {
            return this.adminRepository.destroy({where: {id}})
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }

    async searchOne(pattern: {}): Promise<AdminResponseDto> {
        try {
            return this.toResponse(await this.adminRepository.findOne(pattern))
        } catch (err) {
            throw new BadRequestException(handleSequelizeError(err))
        }
    }
}
