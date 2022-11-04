import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from '../billing/contract.mariadb.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'voip_contract_speed_dial',
    database: 'provisioning',
})
export class VoipContractSpeedDial extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 11,
        nullable: false,
    })
        contract_id: number

    @Column({
        type: 'int',
        unsigned: true,
        width: 64,
        nullable: false,
    })
        slot: string

    @Column({
        type: 'varchar',
        length: 192,
        nullable: false,
    })
        destination: string

    @ManyToOne(() => Contract, contract => contract.id)
    @JoinColumn({name: 'contract_id'})
    contract?: Contract

    fromInternal(csd: internal.CustomerSpeedDial) {
        this.id = csd.id
        this.contract_id = csd.contract_id
        this.slot = csd.slot
        this.destination = csd.destination

        return this
    }

    toInternal(): internal.CustomerSpeedDial {
        const csd = new internal.CustomerSpeedDial()
        csd.id = this.id
        csd.contract_id = this.contract_id
        csd.slot = this.slot
        csd.destination = this.destination

        return csd
    }
}
