import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

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
}
