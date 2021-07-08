import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'admins',
    timestamps: false,
})
export class Admin extends Model {

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
    @ApiProperty()
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
    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
    reseller_id?: number

    @Column({
        type: DataType.STRING(31),
    })
    @Index({
        name: 'login_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    login!: string

    @Column({
        allowNull: true,
        type: DataType.CHAR(32),
    })
    md5pass?: string

    @Column({
        allowNull: true,
        type: DataType.CHAR(54),
    })
    saltedpass?: string

    @Column({
        type: DataType.BOOLEAN,
    })
    is_master!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    is_superuser!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    is_ccare!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    is_active!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    read_only!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    show_passwords!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    call_data!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    billing_data!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    lawful_intercept!: boolean

    @Column({
        allowNull: true,
        type: DataType.BIGINT,
    })
    @Index({
        name: 'ssl_client_m_serial_UNIQUE',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ssl_client_m_serial?: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    ssl_client_certificate?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'email',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    email?: string

    @Column({
        type: DataType.BOOLEAN,
    })
    can_reset_password!: boolean

    @Column({
        type: DataType.BOOLEAN,
    })
    is_system!: boolean
}
