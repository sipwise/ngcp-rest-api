import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'provisioning_templates',
    timestamps: false,
})
export class ProvisioningTemplate extends Model {

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
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.STRING(255),
    })
    description!: string

    @Column({
        type: DataType.ENUM('perl', 'js'),
    })
    lang!: string

    @Column({
        type: DataType.STRING,
    })
    yaml!: string

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

}
