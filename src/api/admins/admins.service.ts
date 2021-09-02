import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common'
import {Admin} from '../../entities/db/billing/admin.entity'
import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {genSalt, hash} from 'bcrypt'
import {AdminResponseDto} from './dto/admin-response.dto'
import {CrudService} from '../../interfaces/crud-service.interface'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {AppService} from 'app.sevice'

@Injectable()
export class AdminsService implements CrudService<AdminCreateDto, AdminResponseDto> {
    constructor(
        private readonly app: AppService
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
        let dbAdmin = Admin.create(admin)
        const bcrypt_version = 'b'
        const bcrypt_cost = 13

        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(admin.password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        dbAdmin.saltedpass = b64salt + "$" + b64hash
        try {
            await Admin.insert(dbAdmin)
            return this.toResponse(dbAdmin)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async readAll(page?: string, rows?: string): Promise<AdminResponseDto[]> {
        try {
            const result = await Admin.find(
                {take: +rows, skip: +rows * (+page - 1)}
            )
            return result.map(adm => this.toResponse(adm))
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async read(id: number): Promise<AdminResponseDto> {
        let entry: Admin
        try {
            entry = await Admin.findOne(id)
        } catch(err) {
            throw new BadRequestException(err)
        }

        if (!entry)
            throw new NotFoundException()

        try {
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async readOneByLogin(login: string): Promise<AdminResponseDto> {
        try {
            return this.toResponse(
                await Admin.findOne(
                    {where: {login: login}}
                )
            )
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async update(id: number, admin: AdminUpdateDto): Promise<AdminResponseDto> {
        let entry: Admin
        try {
            entry = await Admin.findOne(id)
        } catch (err) {
            throw new BadRequestException(err)
        }

        if (!entry)
            throw new NotFoundException()

        try {
            Admin.merge(entry, admin)
            await Admin.update(entry.id, entry)
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async adjust(id: number, patch: PatchOperation[]): Promise<AdminResponseDto> {
        let entry: Admin
        let admin: AdminBaseDto

        try {
            entry = await Admin.findOne(id)
        } catch (err) {
            throw new BadRequestException(err)
        }

        if (!entry)
            throw new NotFoundException()

        try {
            admin = this.deflate(entry)
            admin = applyPatch(admin, patch).newDocument
        } catch (err) {
            throw new BadRequestException(err)
        }

        try {
            entry = Admin.merge(entry, this.inflate(admin))
            await Admin.update(entry.id, entry)
            return this.toResponse(entry)
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async delete(id: number) {
        try {
            let entry = await Admin.findOne(id)
            await Admin.remove(entry)
            return 1
        } catch (err) {
            throw new BadRequestException(err)
        }
    }

    async searchOne(pattern: {}): Promise<AdminResponseDto> {
        try {
            return this.toResponse(
                await Admin.findOne(pattern)
            )
        } catch (err) {
            throw new BadRequestException(err)
        }
    }
}
