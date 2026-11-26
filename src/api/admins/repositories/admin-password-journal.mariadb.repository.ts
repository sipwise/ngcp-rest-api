import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {AdminPasswordJournalRepository} from '~/api/admins/interfaces/admin-password-journal.repository'
import {db, internal} from '~/entities'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

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
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readByAdminIds(adminIds: number[]): Promise<internal.AdminPasswordJournal[]> {
        const journals = await db.billing.AdminPasswordJournal.createQueryBuilder('pass')
            .where('pass.admin_id IN (:...adminIds)', {adminIds})
            .orderBy('pass.id', 'DESC')
            .getMany()
        return journals.map(journal => journal.toInternal())
    }

    async delete(ids: number[]): Promise<void> {
        await db.billing.AdminPasswordJournal.delete(ids)
    }
}
