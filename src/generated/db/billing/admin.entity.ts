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
    id?: number

    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

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
        field: 'is_master',
        type: DataType.TINYINT,
    })
    isMaster!: number

    @Column({
        field: 'is_superuser',
        type: DataType.TINYINT,
    })
    isSuperuser!: number

    @Column({
        field: 'is_ccare',
        type: DataType.TINYINT,
    })
    isCcare!: number

    @Column({
        field: 'is_active',
        type: DataType.TINYINT,
    })
    isActive!: number

    @Column({
        field: 'read_only',
        type: DataType.TINYINT,
    })
    readOnly!: number

    @Column({
        field: 'show_passwords',
        type: DataType.TINYINT,
    })
    showPasswords!: number

    @Column({
        field: 'call_data',
        type: DataType.TINYINT,
    })
    callData!: number

    @Column({
        field: 'billing_data',
        type: DataType.TINYINT,
    })
    billingData!: number

    @Column({
        field: 'lawful_intercept',
        type: DataType.TINYINT,
    })
    lawfulIntercept!: number

    @Column({
        field: 'ssl_client_m_serial',
        allowNull: true,
        type: DataType.BIGINT,
    })
    @Index({
        name: 'ssl_client_m_serial_UNIQUE',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    sslClientMSerial?: number

    @Column({
        field: 'ssl_client_certificate',
        allowNull: true,
        type: DataType.STRING,
    })
    sslClientCertificate?: string

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
        field: 'can_reset_password',
        type: DataType.TINYINT,
    })
    canResetPassword!: number

    @Column({
        field: 'is_system',
        type: DataType.TINYINT,
    })
    isSystem!: number

}
