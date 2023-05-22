import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Discriminator} from '../../internal/profile-package-set.internal.entity'
import {ProfilePackage} from './profile-package.mariadb.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'package_profile_sets',
    database: 'billing',
})
export class PackageProfileSet {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        nullable: false,
        type: 'int',
        width: 11,
    })
    package_id: number

    @Column({
        nullable: false,
        type: 'enum',
        enum: Discriminator,
    })
    discriminator: Discriminator

    @Column({
        nullable: false,
        type: 'int',
        width: 11,
    })
    profile_id: number

    @Column({
        nullable: true,
        type: 'int',
        width: 11,
    })
    network_id?: number

    @ManyToOne(() => ProfilePackage, profilePackage => profilePackage.id)
    @JoinColumn({name: 'package_id'})
    package: ProfilePackage

    toInternal(): internal.ProfilePackageSet {
        return internal.ProfilePackageSet.create({
            id: this.id,
            package_id: this.package_id,
            profile_id: this.profile_id,
            discriminator: this.discriminator,
            network_id: this.network_id,
        })
    }
}
