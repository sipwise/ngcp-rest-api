import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface CallListSuppressionAttributes {
    id?: number;
    domain: string;
    pattern: string;
    label: string;
    direction: string;
    mode: string;
}

@Table({
    tableName: 'call_list_suppressions',
    timestamps: false,
})
export class CallListSuppression extends Model<CallListSuppressionAttributes, CallListSuppressionAttributes> implements CallListSuppressionAttributes {

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
        type: DataType.STRING(255),
    })
    @Index({
        name: 'cls_domain_direction_pattern_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'cls_direction_mode_domain_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    domain!: string

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'cls_domain_direction_pattern_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    pattern!: string

    @Column({
        type: DataType.STRING(255),
    })
    label!: string

    @Column({
        type: DataType.ENUM('outgoing', 'incoming'),
    })
    @Index({
        name: 'cls_domain_direction_pattern_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'cls_direction_mode_domain_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    direction!: string

    @Column({
        type: DataType.ENUM('disabled', 'filter', 'obfuscate'),
    })
    @Index({
        name: 'cls_direction_mode_domain_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    mode!: string

}
