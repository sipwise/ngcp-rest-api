import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VResellerTimezoneAttributes {
    contact_id: number;
    reseller_id: number;
    name?: string;
}

@Table({
    tableName: 'v_reseller_timezone',
    timestamps: false,
    comment: 'VIEW',
})
export class VResellerTimezone extends Model<VResellerTimezoneAttributes, VResellerTimezoneAttributes> implements VResellerTimezoneAttributes {

    @Column({
        type: DataType.INTEGER,
    })
    contact_id!: number

    @Column({
        type: DataType.INTEGER,
    })
    reseller_id!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

}
