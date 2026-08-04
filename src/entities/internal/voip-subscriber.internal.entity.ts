import bcrypt from 'bcryptjs'

export enum VoipSubscriberStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

export class VoipSubscriber {
    id: number
    password?: string
    webPassword: string
    webPasswordModifyTimestamp: Date

    async generateSaltedpass(bcrypt_cost: number = 13, salt?: string): Promise<string> {
        const bcrypt_version = 'b'
        if (!salt) {
            salt = await bcrypt.genSalt(bcrypt_cost)
        } else {
            salt = `$2${bcrypt_version}$${bcrypt_cost.toString().padStart(2, '0')}$${salt}`
        }

        // Generate the hash using bcrypt with the custom salt
        const fullHash = await bcrypt.hash((this.password as string), salt)
        const rawSalt = fullHash.slice(7, 29)
        const b64hash = fullHash.slice(29)
        const saltedpass = `${rawSalt}$${b64hash}`
        return saltedpass
    }
}