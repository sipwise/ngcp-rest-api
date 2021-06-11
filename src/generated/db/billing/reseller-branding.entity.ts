import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ResellerBrandingAttributes {
    id?: number;
    resellerId: number;
    css?: string;
    logo?: Uint8Array;
    logoImageType?: string;
    cscColorPrimary?: string;
    cscColorSecondary?: string;
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
        field: 'reseller_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reseller_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId!: number

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
        field: 'logo_image_type',
        allowNull: true,
        type: DataType.STRING(32),
    })
    logoImageType?: string

    @Column({
        field: 'csc_color_primary',
        allowNull: true,
        type: DataType.STRING(45),
    })
    cscColorPrimary?: string

    @Column({
        field: 'csc_color_secondary',
        allowNull: true,
        type: DataType.STRING(45),
    })
    cscColorSecondary?: string

}
