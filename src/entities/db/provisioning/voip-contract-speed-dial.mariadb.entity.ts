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

    // virtual JSON string
    speeddials: string

    static async fromInternal(csd: internal.CustomerSpeedDial): Promise<VoipContractSpeedDial[]> {
        return await Promise.all(csd.speeddials.map(async (sd) =>
            (VoipContractSpeedDial.create({
                id: sd.id,
                contract_id: csd.contract_id,
                slot: sd.slot,
                destination: sd.destination
            }))
        ))
    }

    static async toInternal(entries: VoipContractSpeedDial[]): Promise<internal.CustomerSpeedDial> {
        const csd = new internal.CustomerSpeedDial()
        csd.contract_id = entries[0].contract_id
        csd.speeddials = await Promise.all(entries.map(async (sd) => ({
                slot: sd.slot,
                destination: sd.destination
            })
        ))
        return csd
    }

    static async rawToInternal(entry: VoipContractSpeedDial): Promise<internal.CustomerSpeedDial> {
        const csd = new internal.CustomerSpeedDial()
        csd.contract_id = entry.contract_id
        csd.speeddials = await JSON.parse(entry.speeddials)
        return csd
    }
}
