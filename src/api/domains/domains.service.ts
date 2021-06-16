import {Inject, Injectable} from '@nestjs/common'
import {Domain} from '../../entities/db/billing/domain.entity'
import {DOMAIN_REPOSITORY} from '../../config/constants.config'
import {CrudService} from "../../services/crud.service";

@Injectable()
export class DomainsService extends CrudService<Domain> {
    constructor(
        @Inject(DOMAIN_REPOSITORY) private readonly domainsRepository: typeof Domain,
    ) {
        super(domainsRepository)
    }
}
