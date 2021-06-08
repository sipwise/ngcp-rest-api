import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'voip_intercept',
    timestamps: false,
})
export class VoipIntercept extends Model {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'PRIMARY',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    id?: number

    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

    @Column({
        field: 'LIID',
        allowNull: true,
        type: DataType.INTEGER,
    })
    lIID?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(63),
    })
    @Index({
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    number?: string

    @Column({
        field: 'cc_required',
        type: DataType.TINYINT,
    })
    ccRequired!: number

    @Column({
        field: 'delivery_host',
        allowNull: true,
        type: DataType.STRING(15),
    })
    deliveryHost?: string

    @Column({
        field: 'delivery_port',
        allowNull: true,
        type: DataType.SMALLINT,
    })
    deliveryPort?: number

    @Column({
        field: 'delivery_user',
        allowNull: true,
        type: DataType.STRING,
    })
    deliveryUser?: string

    @Column({
        field: 'delivery_pass',
        allowNull: true,
        type: DataType.STRING,
    })
    deliveryPass?: string

    @Column({
        field: 'modify_timestamp',
        type: DataType.DATE,
    })
    modifyTimestamp!: Date

    @Column({
        field: 'create_timestamp',
        type: DataType.DATE,
    })
    createTimestamp!: Date

    @Column({
        type: DataType.TINYINT,
    })
    @Index({
        name: 'deleted_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    deleted!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    uuid?: string

    @Column({
        field: 'sip_username',
        allowNull: true,
        type: DataType.STRING(255),
    })
    sipUsername?: string

    @Column({
        field: 'sip_domain',
        allowNull: true,
        type: DataType.STRING(255),
    })
    sipDomain?: string

    @Column({
        field: 'cc_delivery_host',
        allowNull: true,
        type: DataType.STRING(64),
    })
    ccDeliveryHost?: string

    @Column({
        field: 'cc_delivery_port',
        allowNull: true,
        type: DataType.SMALLINT,
    })
    ccDeliveryPort?: number

}
