import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VContractTimezoneAttributes {
    contactId: number;
    contractId: number;
    name?: string;
}

@Table({
    tableName: 'v_contract_timezone',
    timestamps: false,
    comment: 'VIEW',
})
export class VContractTimezone extends Model<VContractTimezoneAttributes, VContractTimezoneAttributes> implements VContractTimezoneAttributes {

    @Column({
        field: 'contact_id',
        type: DataType.INTEGER,
    })
    contactId!: number

    @Column({
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    contractId!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

}
