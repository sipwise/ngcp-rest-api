import {AppService} from '../../app.service'
import {ContractBaseDto} from './dto/contract-base.dto'
import {ContractCreateDto} from './dto/contract-create.dto'
import {ContractResponseDto} from './dto/contract-response.dto'
import {ContractStatus, ContractType} from './contracts.constants'
import {CrudService} from '../../interfaces/crud-service.interface'
import {Equal, FindOneOptions, IsNull, Not} from 'typeorm'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {Injectable, MethodNotAllowedException, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation} from 'fast-json-patch'
import {db} from '../../entities'

enum ContractError {
    InvalidSystemContact = 'The contact_id is not a valid ngcp:systemcontacts item, but an ngcp:customercontacts item'
}

@Injectable()
export class ContractsService implements CrudService<ContractCreateDto, ContractResponseDto> {
    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleDbErrors
    async adjust(id: number, patch: Operation[]): Promise<ContractResponseDto> {
        let entry = await db.billing.Contract.findOneOrFail(id)
        let contract: ContractBaseDto

        // TODO: Utils::BillingMappings::get_actual_billing_mapping
        //  $old_resource->{billing_profile_id} = $billing_mapping->billing_profile->id;
        //  $old_resource->{billing_profile_definition} = undef;
        //  delete $old_resource->{profile_package_id};

        contract = this.deflate(entry) // TODO: how is deflation gonna work here? Create and Base DTO are completely different?

        // TODO: check if id could be changed with patch
        contract = applyPatch(contract, patch).newDocument
        await this.validateUpdate(id, contract)

        return this.toResponse(await this.save(id, contract))

    }

    @HandleDbErrors
    async create(dto: ContractCreateDto): Promise<ContractResponseDto> {

        // TODO: Start transaction guard
        await this.validateCreate(dto)

        let contract = db.billing.Contract.create(dto)

        const now = new Date(Date.now())
        contract.create_timestamp = now
        contract.modify_timestamp = now

        const systemContactPattern = {
            where: {
                status: Not(Equal(ContractStatus.Terminated)),
                id: dto.contact_id,
            },
        }

        let systemContact = await db.billing.Contact.find(systemContactPattern)
        if (!systemContact) {
            // TODO: move validation out of creation
            throw new UnprocessableEntityException('invalid contact_id')
        }
        // TODO: Utils::BillingMappings::prepare_billing_mappings
        let product = await db.billing.Product.findOne({where: {class: dto.type}})
        if (!product) {
            // TODO: move validation out of creation
            throw new UnprocessableEntityException('invalid "type"')
        }
        contract.product_id = product.id
        await db.billing.Contract.insert(contract)

        // TODO: Utils::Contract::is_peering_reseller_product && Utils::BillingMappings::check_prepaid_profiles_exist

        // TODO: I don't think it is possible to have a CustomerContact here because we explicitly search for SystemContacts before
        // if (contract.contact.reseller_id) {
        //     throw new UnprocessableEntityException(ContractError.InvalidSystemContact)
        // }

        // TODO: Utils::BillingMappings::append_billing_mappings
        //   $contract = $self->contract_by_id($c, $contract->id,1,$now); What would this do, we just created the contract, no?
        //   Utils::ProfilePackages::create_initial_contract_balances

        //  TODO: Commit transaction
        return this.toResponse(contract)
    }

    async delete(id: number): Promise<number> {
        throw new MethodNotAllowedException()
    }

    @HandleDbErrors
    async read(id: number): Promise<ContractResponseDto> {
        return this.toResponse(await db.billing.Contract.findOneOrFail(id))
    }

    @HandleDbErrors
    async readAll(page: number, rows: number): Promise<ContractResponseDto[]> {
        const result = await db.billing.Contract.find({
            take: +rows, skip: +rows * (+page - 1),
        })
        return result.map(r => this.toResponse(r))
    }

    toResponse(c: db.billing.Contract): ContractResponseDto {
        return {
            billing_profile_definition: undefined,
            billing_profile_id: 0,
            contact_id: c.contact_id,
            external_id: '',
            id: c.id,
            status: ContractStatus[c.status],
            type: ContractType.Reseller,
        }
    }

    async update(id: number, dto: ContractCreateDto): Promise<ContractResponseDto> {
        // TODO: Implement PUT logic
        await db.billing.Contract.findOneOrFail(id)

        return Promise.resolve(undefined)
    }

    private inflate(dto: ContractBaseDto): db.billing.Contract {
        return Object.assign(dto)
    }

    private deflate(entry: db.billing.Contract): ContractBaseDto {
        return Object.assign(entry)
    }

    @HandleDbErrors
    private async save(id: number, newContract: ContractBaseDto): Promise<db.billing.Contract> {
        let oldContract = await db.billing.Contract.findOneOrFail(id)
        // const billingMapping = Utils::BillingMappings::get_actual_billing_mapping(c => $c, now => $now, contract => $contract, );
        // const billingProfile = billingMapping.billingProfile

        // $resource->{contact_id} //= undef;
        // $resource->{type} //= $contract->product->class;
        // I think above two steps are redundant

        const setPackage: boolean = newContract.billing_profile_definition == 'package' // TODO: check because v1 definition does not contain "package" in enum "billing_profile_definition

        // Utils::BillingMappings::prepare_billing_mappings

        //     if (
        //         NGCP::Panel::Utils::Contract::is_peering_reseller_contract( c => $c, contract => $contract )
        //         &&
        //         ( my $prepaid_billing_profile_exist = NGCP::Panel::Utils::BillingMappings::check_prepaid_profiles_exist(
        //             c => $c,
        //             mappings_to_create => $mappings_to_create) )
        //     ) {
        if (newContract.status == 'terminated') {

        }
        oldContract = await db.billing.Contract.merge(oldContract, this.inflate(newContract))
        await oldContract.save()
        return oldContract
    }

    private async validateUpdate(id: number, newContract: ContractBaseDto) {
        const pattern: FindOneOptions = {
            where: {
                reseller_id: IsNull(),
                status: Not(Equal(ContractStatus.Terminated)),
            },
        }
        const oldContract = await db.billing.Contract.findOneOrFail(id)
        if (oldContract.contact_id != newContract.contact_id) {
            const systemContact = await db.billing.Contact.findOne(pattern)
            if (!systemContact) {
                throw new UnprocessableEntityException('invalid contact_id')
            }
        }

    }

    // TODO: have function return multiple errors so they can be returned together?
    private async validateCreate(contract: ContractCreateDto) {
        let pattern: FindOneOptions = {
            where: {
                status: Not(Equal(ContractStatus.Terminated)),
                id: contract.contact_id,
            },
        }
        const systemContact = db.billing.Contact.findOne(pattern)
        if (!systemContact) {
            throw new UnprocessableEntityException('invalid \'contact_id\'')
        }

        let product = await db.billing.Product.findOne({where: {class: contract.type}})
        if (!product) {
            throw new UnprocessableEntityException('invalid "type"')
        }
    }
}