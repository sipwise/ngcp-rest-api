import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface LnpNumberAttributes {
    id?: number;
    number: string;
    routingNumber?: string;
    lnpProviderId: number;
    start?: Date;
    end?: Date;
    type?: string;
}

@Table({
    tableName: 'lnp_numbers',
    timestamps: false,
})
export class LnpNumber extends Model<LnpNumberAttributes, LnpNumberAttributes> implements LnpNumberAttributes {

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
        type: DataType.STRING(31),
    })
    @Index({
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    number!: string

    @Column({
        field: 'routing_number',
        allowNull: true,
        type: DataType.STRING(31),
    })
    routingNumber?: string

    @Column({
        field: 'lnp_provider_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'l_n_lnpproid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    lnpProviderId!: number

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'l_n_start_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    start?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    end?: Date

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    type?: string

}
