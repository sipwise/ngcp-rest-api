import {Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {AppService} from '../../../../app.service'
import {db} from '../../../../entities'
import {LoggerService} from '../../../../logger/logger.service'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {I18nService} from 'nestjs-i18n'
import {SubscriberPasswordJournalMariadbRepository} from './repositories/subscriber-password-journal.mariadb.repository'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'

@Injectable()
export class PasswordChangeService {
    private readonly log = new LoggerService(PasswordChangeService.name)

    constructor(
        private readonly app: AppService,
        private readonly adminPasswordJournalRepo: AdminPasswordJournalMariadbRepository,
        private readonly subscriberPasswordJournalRepo: SubscriberPasswordJournalMariadbRepository,
        private readonly i18n: I18nService,
    ) {
    }

    async changePassword(sr: ServiceRequest, id:number, newPassword:string, realm:string): Promise<void> {
        if (realm === 'subscriber') {
            return await this.changeSubscriberPassword(sr, id, newPassword)
        } else if (realm === 'admin') {
            return await this.changeAdminPassword(sr, id, newPassword)
        } else {
            throw new NotFoundException()
        }
    }

    async changeAdminPassword(sr: ServiceRequest, id:number, newPassword: string): Promise<void> {
        const admin = await db.billing.Admin.findOne({
            where: {
                id: id,
            },
        })
        if (!admin) {
            throw new NotFoundException()
        }

        const internal = await admin.toInternal()
        internal.password = newPassword
        internal.saltedpass = await internal.generateSaltedpass()
        internal.saltedpass_modify_timestamp = new Date()
        if (this.app.config.security.password.web_validate && this.app.config.security.password.web_keep_last_used > 0) {
            const lastPasswords = await this.adminPasswordJournalRepo.readLastNPasswords(admin.id, this.app.config.security.password.web_keep_last_used, sr)
            for (const pass of lastPasswords) {
                const [storedSalt, storedHash] = pass.value.split('$')
                const generatedHash = await internal.generateSaltedpass(6, storedSalt)
                if (generatedHash.split('$')[1] === storedHash) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.PASSWORD_ALREADY_USED'))
                }
            }
            const journalHash = await internal.generateSaltedpass(6)
            const journal = db.billing.AdminPasswordJournal.create({admin_id: admin.id, value: journalHash})
            const keepPasswordAmount = this.app.config.security.password.web_keep_last_used
            await this.adminPasswordJournalRepo.create([journal], sr)
            await this.adminPasswordJournalRepo.keepLastNPasswords(admin.id, keepPasswordAmount, sr)
        }
        await this.app.dbRepo(db.billing.Admin).update(
            {id: admin.id},
            {saltedpass: internal.saltedpass , saltedpass_modify_timestamp: internal.saltedpass_modify_timestamp},
        )
    }

    async changeSubscriberPassword(sr: ServiceRequest, id:number, newPassword: string): Promise<void> {
        const subscriber = await db.provisioning.VoipSubscriber.findOne({
            where: {
                id: id,
            },
        })
        if (!subscriber) {
            throw new NotFoundException()
        }

        const internal = await subscriber.toInternal()
        internal.password = newPassword
        internal.webPassword = await internal.generateSaltedpass()
        internal.webPasswordModifyTimestamp = new Date()
        if (this.app.config.security.password.web_validate && this.app.config.security.password.web_keep_last_used > 0) {
            const lastPasswords = await this.subscriberPasswordJournalRepo.readLastNPasswords(subscriber.id, this.app.config.security.password.web_keep_last_used, sr)
            for (const pass of lastPasswords) {
                const [storedSalt, storedHash] = pass.value.split('$')
                const generatedHash = await internal.generateSaltedpass(6, storedSalt)
                if (generatedHash.split('$')[1] === storedHash) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.PASSWORD_ALREADY_USED'))
                }
            }
            const journalHash = await internal.generateSaltedpass(6)
            const journal = db.provisioning.VoipSubscriberWebPasswordJournal.create({subscriber_id: subscriber.id, value: journalHash})
            const keepPasswordAmount = this.app.config.security.password.web_keep_last_used
            await this.subscriberPasswordJournalRepo.create([journal], sr)
            await this.subscriberPasswordJournalRepo.keepLastNPasswords(subscriber.id, keepPasswordAmount, sr)
        }
        await this.app.dbRepo(db.provisioning.VoipSubscriber).update(
            {id: subscriber.id},
            {webpassword: internal.webPassword , webpassword_modify_timestamp: internal.webPasswordModifyTimestamp},
        )
    }
}