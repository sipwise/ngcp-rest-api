import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ResellerBrandingAttributes {
    id?: number;
    reseller_id: number;
    css?: string;
    logo?: Uint8Array;
    logo_image_type?: string;
    csc_color_primary?: string;
    csc_color_secondary?: string;
}

@Table({
    tableName: 'reseller_brandings',
    timestamps: false,
})
export class ResellerBranding extends Model<ResellerBrandingAttributes, ResellerBrandingAttributes> implements ResellerBrandingAttributes {

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
        name: 'reseller_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    reseller_id!: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    css?: string

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    logo?: Uint8Array

    @Column({
        allowNull: true,
        type: DataType.STRING(32),
    })
    logo_image_type?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(45),
    })
    csc_color_primary?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(45),
    })
    csc_color_secondary?: string

}
