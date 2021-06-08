import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'package_profile_sets',
    timestamps: false,
})
export class PackageProfileSet extends Model {

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
        field: 'package_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_packdiscr_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    packageId!: number

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
        field: 'profile_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_profile_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    profileId!: number

    @Column({
        field: 'network_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pps_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    networkId?: number

}
