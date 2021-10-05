import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AppService} from '../../app.service'
import {CrudService} from '../../interfaces/crud-service.interface'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {db} from '../../entities'
import {genSalt, hash} from 'bcrypt'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {Admin} from '../../entities/db/billing'

const SPECIAL_USER_LOGIN = 'sipwise'

@Injectable()
export class AdminsService implements CrudService<AdminCreateDto, AdminResponseDto> {
    private l: Logger

    constructor(
        private readonly app: AppService,
    ) {
        this.l = new Logger('AdminService')
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
        // TODO: only allow creation when is_master flag is set for user
        let dbAdmin = db.billing.Admin.create(admin)

        dbAdmin.saltedpass = await this.generateSaltedpass(admin.password)

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
    async update(id: number, admin: AdminUpdateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        const userId = req.user.id
        let oldAdmin = await db.billing.Admin.findOneOrFail(id)

        let newAdmin = db.billing.Admin.merge(oldAdmin, admin)

        // generate saltedpass if new password was provided
        if (admin['password'] !== undefined) {
            newAdmin.saltedpass = await this.generateSaltedpass(admin.password)
        }
        newAdmin = this.validateUpdate(oldAdmin, newAdmin, userId)
        await db.billing.Admin.update(oldAdmin.id, newAdmin)
        return this.toResponse(oldAdmin)
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation[], req: ServiceRequest): Promise<AdminResponseDto> {
        const userId = req.user.id
        let admin: AdminBaseDto
        let oldAdmin = await db.billing.Admin.findOneOrFail(id)

        admin = this.deflate(oldAdmin)

        // set password to current salted pass and compare if changed after patch
        // if it was changed, generated new saltedpass from password
        admin.password = oldAdmin.saltedpass
        admin = applyPatch(admin, patch).newDocument

        let newAdmin = this.inflate(admin)
        if (admin.password != oldAdmin.saltedpass) {
            newAdmin.saltedpass = await this.generateSaltedpass(admin.password)
        }

        newAdmin = this.validateUpdate(oldAdmin, newAdmin, userId)
        await db.billing.Admin.update(oldAdmin.id, newAdmin)
        return this.toResponse(oldAdmin)
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest) {
        const usr: AuthResponseDto = req.user
        if (usr.id == id) {
            throw new ForbiddenException('cannot delete own user')
        }

        let entry = await db.billing.Admin.findOneOrFail(id)
        if (entry.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException('cannot delete special user ' + SPECIAL_USER_LOGIN)
        }

        await db.billing.Admin.remove(entry)
        return 1
    }

    @HandleDbErrors
    async searchOne(pattern: {}): Promise<AdminResponseDto> {
        return this.toResponse(
            await db.billing.Admin.findOneOrFail(pattern),
        )
    }

    /**
     * Prevents change of passwords of other admin users and prevents change of
     * protected fields when updating self (admin.id == user.id)
     * @param oldAdmin
     * @param newAdmin
     * @param userId
     * @private
     *
     * @returns admin object used to update the current entry
     */
    private validateUpdate(oldAdmin: Admin, newAdmin: Admin, userId: number): Admin {
        if (oldAdmin.saltedpass != newAdmin.saltedpass && newAdmin.id != userId) {
            throw new ForbiddenException('password can only be changed for self')
        }

        // remove fields that are not changeable by self
        if (newAdmin.id == userId) {
            ['is_master', 'is_active', 'read_only'].map(s => {
                if (newAdmin[s] !== undefined) {
                    delete newAdmin[s]
                }
            })
        }
        return newAdmin
    }

    private inflate(dto: AdminBaseDto): db.billing.Admin {
        return db.billing.Admin.create(dto)
    }

    private deflate(entry: db.billing.Admin): AdminBaseDto {
        return Object.assign(entry)
    }

    private async generateSaltedpass(password: string): Promise<string> {
        const bcrypt_version = 'b'
        const bcrypt_cost = 13
        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        return b64salt + '$' + b64hash
    }
}
