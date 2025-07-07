import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from 'typeorm'

import {internal} from '~/entities'
import {Contract} from '~/entities/db/billing/contract.mariadb.entity'
import {getFreeRatio} from '~/helpers/billing.helper'
import {isInfiniteFuture} from '~/helpers/date.helper'

@Entity({
    name: 'contract_balances',
    database: 'billing',
})
export class ContractBalance extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        contract_id?: number

    @Column({
        type: 'double',
        nullable: true,
        default: null,
    })
        cash_balance?: number

    @Column({
        type: 'double',
        nullable: false,
        default: 0,
    })
        cash_balance_interval?: number

    @Column({
        type: 'int',
        nullable: true,
        default: null,
    })
        free_time_balance?: number

    @Column({
        type: 'int',
        nullable: false,
        default: 0,
    })
        free_time_balance_interval?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        invoice_id?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        topup_count?: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        timely_topup_count?: number

    @Column({
        type: 'datetime',
        nullable: false,
    })
        start!: Date

    @Column({
        type: 'datetime',
        nullable: false,
    })
        end!: Date

    @Column({
        type: 'datetime',
        nullable: true,
    })
        underrun_profiles?: Date

    @Column({
        type: 'datetime',
        nullable: true,
    })
        underrun_lock?: Date

    @Column({
        type: 'double',
        nullable: true,
        default: null,
    })
        initial_cash_balance?: number

    @Column({
        type: 'int',
        nullable: true,
        default: null,
    })
        initial_free_time_balance?: number

    @OneToOne(() => Contract)
    @JoinColumn({name: 'contract_id', referencedColumnName: 'id'})
        contract!: Contract

    toInternal(): internal.ContractBalance {
        const entity = new internal.ContractBalance()
        entity.id = this.id
        entity.contractId = this.contract_id
        entity.cashBalance = this.cash_balance
        entity.cashBalanceInterval = this.cash_balance_interval
        entity.freeTimeBalance = this.free_time_balance
        entity.freeTimeBalanceInterval = this.free_time_balance_interval
        entity.invoiceId = this.invoice_id
        entity.topupCount = this.topup_count
        entity.timelyTopupCount = this.timely_topup_count
        entity.start = this.start
        entity.end = this.end
        entity.underrunProfiles = this.underrun_profiles
        entity.underrunLock = this.underrun_lock
        entity.initialCashBalance = this.initial_cash_balance
        entity.initialFreeTimeBalance = this.initial_free_time_balance
        const contractCreatedAt = this.contract.create_timestamp ?? this.contract.modify_timestamp
        const ratio = (this.start <= contractCreatedAt &&
            (isInfiniteFuture(this.end) || this.end >= contractCreatedAt))
            ? getFreeRatio(contractCreatedAt, this.start, this.end)
            : 1.0
        entity.debit = Math.round(entity.cashBalanceInterval / 100)
        entity.ratio = ratio
        return entity
    }

    fromInternal(balance: internal.ContractBalance): ContractBalance {
        this.id = balance.id as number
        this.contract_id = balance.contractId
        this.cash_balance = balance.cashBalance
        this.cash_balance_interval = balance.cashBalanceInterval
        this.free_time_balance = balance.freeTimeBalance
        this.free_time_balance_interval = balance.freeTimeBalanceInterval
        this.invoice_id = balance.invoiceId
        this.topup_count = balance.topupCount
        this.timely_topup_count = balance.timelyTopupCount
        this.start = balance.start
        this.end = balance.end
        this.underrun_profiles = balance.underrunProfiles
        this.underrun_lock = balance.underrunLock
        this.initial_cash_balance = balance.initialCashBalance
        this.initial_free_time_balance = balance.initialFreeTimeBalance
        return this
    }
}
