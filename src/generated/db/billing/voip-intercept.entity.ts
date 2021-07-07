import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface VoipInterceptAttributes {
    id?: number;
    reseller_id?: number;
    liid?: number;
    number?: string;
    cc_required: number;
    delivery_host?: string;
    delivery_port?: number;
    delivery_user?: string;
    delivery_pass?: string;
    modify_timestamp: Date;
    create_timestamp: Date;
    deleted: number;
    uuid?: string;
    sip_username?: string;
    sip_domain?: string;
    cc_delivery_host?: string;
    cc_delivery_port?: number;
}

@Table({
    tableName: 'voip_intercept',
    timestamps: false,
})
export class VoipIntercept extends Model<VoipInterceptAttributes, VoipInterceptAttributes> implements VoipInterceptAttributes {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id?: number

    @Column({
        field: 'LIID',
        allowNull: true,
        type: DataType.INTEGER,
    })
    liid?: number

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
        type: DataType.TINYINT,
    })
    cc_required!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(15),
    })
    delivery_host?: string

    @Column({
        allowNull: true,
        type: DataType.SMALLINT,
    })
    delivery_port?: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    delivery_user?: string

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    delivery_pass?: string

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

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
        allowNull: true,
        type: DataType.STRING(255),
    })
    sip_username?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    sip_domain?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(64),
    })
    cc_delivery_host?: string

    @Column({
        allowNull: true,
        type: DataType.SMALLINT,
    })
    cc_delivery_port?: number

}
