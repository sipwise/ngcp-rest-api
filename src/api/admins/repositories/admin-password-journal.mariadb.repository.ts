import {Inject, Injectable} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {SelectQueryBuilder} from 'typeorm'
import {LoggerService} from '../../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {AdminOptions} from '../interfaces/admin-options.interface'
import {MariaDbRepository} from '../../../repositories/mariadb.repository'
import {AdminPasswordJournalRepository} from '../interfaces/admin-password-journal.repository'

@Injectable()
export class AdminPasswordJournalMariadbRepository extends MariaDbRepository implements AdminPasswordJournalRepository{
    private readonly log = new LoggerService(AdminPasswordJournalMariadbRepository.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        super()
    }

    async create(admins: internal.AdminPasswordJournal[]): Promise<number[]> {
        const qb = db.billing.AdminPasswordJournal.createQueryBuilder('pass')
        const values = admins.map(admin => new db.billing.AdminPasswordJournal().fromInternal(admin))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map(obj => obj.id)
    }

    async readLastNPasswords(adminId: number, n: number): Promise<internal.AdminPasswordJournal[]> {
        const qb = db.billing.AdminPasswordJournal.createQueryBuilder('pass')
        qb.where('pass.admin_id = :admin_id', {admin_id: adminId})
        qb.orderBy('pass.id', 'DESC')
        qb.limit(n)
        return await qb.getMany()
    }

    async keepLastNPasswords(adminId: number, n: number): Promise<void> {
        const idsQb = db.billing.AdminPasswordJournal.createQueryBuilder('pass')
            .select('pass.id')
            .where('pass.admin_id = :admin_id', {admin_id: adminId})
            .orderBy('pass.id', 'DESC')
            .limit(n)

        const ids = await idsQb.getMany()
        const lastIdToKeep = ids.pop()?.id

        if (!lastIdToKeep) {
            return
        }

        const deleteQb = db.billing.AdminPasswordJournal.createQueryBuilder()
            .delete()
            .where('admin_id = :admin_id', {admin_id: adminId})
            .andWhere('id < :id', {id: lastIdToKeep})

        await deleteQb.execute()
    }
}
