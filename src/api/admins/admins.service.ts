import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AppService} from '../../app.service'
import {CrudService} from '../../interfaces/crud-service.interface'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Injectable} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {db} from '../../entities'
import {genSalt, hash} from 'bcrypt'

@Injectable()
export class AdminsService implements CrudService<AdminCreateDto, AdminResponseDto> {
    constructor(
        private readonly app: AppService,
    ) {
    }

    toResponse(db: db.billing.Admin): AdminResponseDto {
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

    @HandleDbErrors
    async create(admin: AdminCreateDto): Promise<AdminResponseDto> {
        let dbAdmin = db.billing.Admin.create(admin)
        const bcrypt_version = 'b'
        const bcrypt_cost = 13
        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(admin.password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        dbAdmin.saltedpass = b64salt + '$' + b64hash

        await db.billing.Admin.insert(dbAdmin)
        return this.toResponse(dbAdmin)
    }

    @HandleDbErrors
    async readAll(page?: number, rows?: number): Promise<AdminResponseDto[]> {
        const result = await db.billing.Admin.find(
            {take: rows, skip: rows * (page - 1)},
        )
        return result.map(adm => this.toResponse(adm))
    }

    @HandleDbErrors
    async read(id: number): Promise<AdminResponseDto> {
        let entry = await db.billing.Admin.findOneOrFail(id)
        return this.toResponse(entry)
    }

    @HandleDbErrors
    async readOneByLogin(login: string): Promise<AdminResponseDto> {
        return this.toResponse(
            await db.billing.Admin.findOneOrFail(
                {where: {login: login}},
            ),
        )
    }

    @HandleDbErrors
    async update(id: number, admin: AdminUpdateDto): Promise<AdminResponseDto> {
        let entry = await db.billing.Admin.findOneOrFail(id)
        entry = db.billing.Admin.merge(entry, admin)
        await db.billing.Admin.update(entry.id, entry)
        return this.toResponse(entry)
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation[]): Promise<AdminResponseDto> {
        let admin: AdminBaseDto
        let entry = await db.billing.Admin.findOneOrFail(id)

        admin = this.deflate(entry)
        admin = applyPatch(admin, patch).newDocument

        entry = db.billing.Admin.merge(entry, this.inflate(admin))
        await db.billing.Admin.update(entry.id, entry)
        return this.toResponse(entry)
    }

    @HandleDbErrors
    async delete(id: number) {
        let entry = await db.billing.Admin.findOneOrFail(id)
        await db.billing.Admin.remove(entry)
        return 1
    }

    @HandleDbErrors
    async searchOne(pattern: {}): Promise<AdminResponseDto> {
        return this.toResponse(
            await db.billing.Admin.findOneOrFail(pattern),
        )
    }

    private inflate(dto: AdminBaseDto): db.billing.Admin {
        return db.billing.Admin.create(dto)
    }

    private deflate(entry: db.billing.Admin): AdminBaseDto {
        return Object.assign(entry)
    }
}
