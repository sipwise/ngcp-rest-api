import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface PackageProfileSetAttributes {
    id?: number;
    package_id: number;
    discriminator: string;
    profile_id: number;
    network_id?: number;
}

@Table({
    tableName: 'package_profile_sets',
    timestamps: false,
})
export class PackageProfileSet extends Model<PackageProfileSetAttributes, PackageProfileSetAttributes> implements PackageProfileSetAttributes {

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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_packdiscr_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    package_id!: number

    @Column({
        type: DataType.ENUM('initial', 'underrun', 'topup'),
    })
    @Index({
        name: 'pps_packdiscr_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    discriminator!: string

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_profile_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profile_id!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    network_id?: number

}
