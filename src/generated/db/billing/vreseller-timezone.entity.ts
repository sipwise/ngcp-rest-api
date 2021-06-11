import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VResellerTimezoneAttributes {
    contactId: number;
    resellerId: number;
    name?: string;
}

@Table({
    tableName: 'v_reseller_timezone',
    timestamps: false,
    comment: 'VIEW',
})
export class VResellerTimezone extends Model<VResellerTimezoneAttributes, VResellerTimezoneAttributes> implements VResellerTimezoneAttributes {

    @Column({
        field: 'contact_id',
        type: DataType.INTEGER,
    })
    contactId!: number

    @Column({
        field: 'reseller_id',
        type: DataType.INTEGER,
    })
    resellerId!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

}
