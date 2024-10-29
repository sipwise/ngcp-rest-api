import {ProfilePackage} from './profile-package.internal.entity'

export enum Discriminator {
    Initial = 'initial',
    UnderRun = 'underrun',
    TopUp = 'topup'
}

interface ProfilePackageSetInterface {
    id?: number
    package_id: number
    discriminator: Discriminator
    profile_id: number
    network_id?: number
    package?: ProfilePackage
}

export class ProfilePackageSet implements ProfilePackageSetInterface {
    id?: number
    package_id: number
    discriminator: Discriminator
    profile_id: number
    network_id?: number
    package?: ProfilePackage

    static create(data: ProfilePackageSetInterface): ProfilePackageSet {
        const billingNetwork = new ProfilePackageSet()

        Object.keys(data).map(key => {
            billingNetwork[key] = data[key]
        })
        return billingNetwork
    }
}
