import {Column, DataType, Model, Table} from 'sequelize-typescript'
import {ApiProperty} from '@nestjs/swagger'

@Table({tableName: 'journal', timestamps: false})
export class Journal extends Model<Journal> {
    @ApiProperty()
    @Column({primaryKey: true, autoIncrement: true, type: DataType.INTEGER})
    id?: number

    @ApiProperty()
    @Column({type: DataType.ENUM('create', 'update', 'delete')})
    operation!: string

    @ApiProperty()
    @Column({type: DataType.STRING(64)})
    resource_name!: string

    @ApiProperty()
    @Column({type: DataType.INTEGER})
    resource_id!: number

    @ApiProperty()
    @Column({type: DataType.DECIMAL(13, 3)})
    timestamp!: number

    @ApiProperty()
    @Column({allowNull: true, type: DataType.STRING(127)})
    username?: string

    @ApiProperty()
    @Column({type: DataType.ENUM('storable', 'json', 'json_deflate', 'sereal')})
    content_format!: string

    @ApiProperty()
    @Column({allowNull: true, type: DataType.BLOB})
    content?: Uint8Array
}
