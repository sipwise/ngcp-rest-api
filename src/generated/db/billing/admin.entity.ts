import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface AdminAttributes {
    id?: number;
    reseller_id?: number;
    login: string;
    md5pass?: string;
    saltedpass?: string;
    is_master: number;
    is_superuser: number;
    is_ccare: number;
    is_active: number;
    read_only: number;
    show_passwords: number;
    call_data: number;
    billing_data: number;
    lawful_intercept: number;
    ssl_client_m_serial?: number;
    ssl_client_certificate?: string;
    email?: string;
    can_reset_password: number;
    is_system: number;
}

@Table({
    tableName: 'admins',
    timestamps: false,
})
export class Admin extends Model<AdminAttributes, AdminAttributes> implements AdminAttributes {

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
        type: DataType.TINYINT,
    })
    is_master!: number

    @Column({
        type: DataType.TINYINT,
    })
    is_superuser!: number

    @Column({
        type: DataType.TINYINT,
    })
    is_ccare!: number

    @Column({
        type: DataType.TINYINT,
    })
    is_active!: number

    @Column({
        type: DataType.TINYINT,
    })
    read_only!: number

    @Column({
        type: DataType.TINYINT,
    })
    show_passwords!: number

    @Column({
        type: DataType.TINYINT,
    })
    call_data!: number

    @Column({
        type: DataType.TINYINT,
    })
    billing_data!: number

    @Column({
        type: DataType.TINYINT,
    })
    lawful_intercept!: number

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
        type: DataType.TINYINT,
    })
    can_reset_password!: number

    @Column({
        type: DataType.TINYINT,
    })
    is_system!: number

}
