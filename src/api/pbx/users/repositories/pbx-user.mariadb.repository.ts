import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {PbxUserSearchDto} from '~/api/pbx/users/dto/pbx-user-search.dto'
import {PbxUserOptions} from '~/api/pbx/users/interfaces/pbx-user-options.interface'
import {PbxUserRepository} from '~/api/pbx/users/interfaces/pbx-user.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class PbxUserMariadbRepository extends MariaDbRepository implements PbxUserRepository {
    private readonly log = new LoggerService(PbxUserMariadbRepository.name)

    constructor(
    ) {
        super()
    }

    async readAll(options: PbxUserOptions, sr: ServiceRequest): Promise<[internal.PbxUser[], number]> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pSubscriber')
        await this.addJoinAndWhere(qb)
        const searchDto = new PbxUserSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias),
        )
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (pbxUser) => pbxUser.toInternalPbxUser())), totalCount]
    }

    async readById(id: number, options: PbxUserOptions, _sr: ServiceRequest): Promise<internal.PbxUser> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pSubscriber')
        await this.addJoinAndWhere(qb)
        qb.where('bSubscriber.id = :id', {id})
        this.addFilterBy(qb, options.filterBy)
        const pbxUser = await qb.getOneOrFail()
        return pbxUser.toInternalPbxUser()
    }

    private mapPbxCustomer(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>): void {
        qb.andWhere('pSubscriber.is_pbx_pilot = 0')
        qb.andWhere('pSubscriber.is_pbx_group = 0')
        qb.leftJoinAndSelect('pSubscriber.contract', 'contract')
        qb.leftJoinAndSelect('contract.product', 'product')
        qb.andWhere('product.class = :class', {class: 'pbxaccount'})
    }

    private joinBillingSubscriber(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>): void {
        qb.leftJoinAndSelect('pSubscriber.billing_voip_subscriber', 'bSubscriber')
    }

    private async mapPreferences(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>): Promise<void> {
        const preference = await db.provisioning.VoipPreference.createQueryBuilder()
            .where('attribute = :attribute', {attribute: 'display_name'})
            .getOneOrFail()
        qb.leftJoinAndMapMany(
            'pSubscriber.preferences',
            db.provisioning.VoipUsrPreference,
            'preferences',
            'preferences.subscriber_id=pSubscriber.id AND preferences.attribute_id = :attributeId',
            {attributeId: preference.id},
        )
    }

    private mapPrimaryNumber(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>): void {
        qb.leftJoinAndMapOne(
            'bSubscriber.primaryNumber',
            db.billing.VoipNumber,
            'voipNumber',
            'voipNumber.id = bSubscriber.primary_number_id',
        )
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, filterBy: PbxUserOptions['filterBy']): void {
        if (filterBy) {
            if (filterBy.id) {
                qb.andWhere('bSubscriber.id = :id', {id: filterBy.id})
            }
            if (filterBy.customerId) {
                qb.andWhere('bSubscriber.contract_id = :customerId', {customerId: filterBy.customerId})
            }
            if (filterBy.resellerId) {
                qb.leftJoinAndSelect('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
        }
    }

    private async addJoinAndWhere(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>): Promise<void> {
        this.mapPbxCustomer(qb)
        this.joinBillingSubscriber(qb)
        await this.mapPreferences(qb)
        this.mapPrimaryNumber(qb)
    }
}
