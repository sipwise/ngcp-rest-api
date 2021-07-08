import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

export interface AdminDbAttributes {
    id?: number;
    reseller_id?: number;
    login: string;
    md5pass?: string;
    saltedpass?: string;
    is_master: boolean;
    is_superuser: boolean;
    is_ccare: boolean;
    is_active: boolean;
    read_only: boolean;
    show_passwords: boolean;
    call_data: boolean;
    billing_data: boolean;
    lawful_intercept: boolean;
    ssl_client_m_serial?: number;
    ssl_client_certificate?: string;
    email?: string;
    can_reset_password: boolean;
    is_system: boolean;
}

@Table({
    tableName: 'admins',
    timestamps: false,
})
export class Admin extends Model<AdminDbAttributes, AdminDbAttributes> implements AdminDbAttributes {

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
