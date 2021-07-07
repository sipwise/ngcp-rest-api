import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VSubscriberTimezoneAttributes {
    contact_id?: number;
    subscriber_id: number;
    uuid: string;
    name?: string;
}

@Table({
    tableName: 'v_subscriber_timezone',
    timestamps: false,
    comment: 'VIEW',
})
export class VSubscriberTimezone extends Model<VSubscriberTimezoneAttributes, VSubscriberTimezoneAttributes> implements VSubscriberTimezoneAttributes {

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    contact_id?: number

    @Column({
        type: DataType.INTEGER,
    })
    subscriber_id!: number

    @Column({
        type: DataType.CHAR(36),
    })
    uuid!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

}
