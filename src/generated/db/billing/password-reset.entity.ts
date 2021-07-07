import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface PasswordResetAttributes {
    id?: number;
    subscriber_id: number;
    uuid: string;
    timestamp: number;
}

@Table({
    tableName: 'password_resets',
    timestamps: false,
})
export class PasswordReset extends Model<PasswordResetAttributes, PasswordResetAttributes> implements PasswordResetAttributes {

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
        name: 'fk_pwd_reset_sub',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriber_id!: number

    @Column({
        type: DataType.CHAR(36),
    })
    @Index({
        name: 'uuid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    uuid!: string

    @Column({
        type: DataType.INTEGER,
    })
    timestamp!: number

}
