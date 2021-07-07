import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VContractTimezoneAttributes {
    contact_id: number;
    contract_id: number;
    name?: string;
}

@Table({
    tableName: 'v_contract_timezone',
    timestamps: false,
    comment: 'VIEW',
})
export class VContractTimezone extends Model<VContractTimezoneAttributes, VContractTimezoneAttributes> implements VContractTimezoneAttributes {

    @Column({
        type: DataType.INTEGER,
    })
    contact_id!: number

    @Column({
        type: DataType.INTEGER,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

}
