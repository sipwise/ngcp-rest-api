import {Column, DataType, Model, Table} from 'sequelize-typescript'

interface VSubscriberTimezoneAttributes {
    contactId?: number;
    subscriberId: number;
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
        field: 'contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    contactId?: number

    @Column({
        field: 'subscriber_id',
        type: DataType.INTEGER,
    })
    subscriberId!: number

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
