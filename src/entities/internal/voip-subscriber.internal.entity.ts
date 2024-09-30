import {genSalt, hash} from "bcrypt";
import {IsDate, IsNotEmpty, IsNumber, IsOptional, IsString} from "class-validator";

export enum VoipSubscriberStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

export class VoipSubscriber {
    @IsNumber()
    @IsNotEmpty()
    id: number

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    password?: string

    @IsString()
    @IsNotEmpty()
    webPassword: string

    @IsDate()
    @IsNotEmpty()
    webPasswordModifyTimestamp: Date

    async generateSaltedpass(bcrypt_cost: number = 13, salt?: string) {
        const bcrypt_version = 'b'
        if (!salt) {
            salt = await genSalt(bcrypt_cost)
        } else {
            salt = `$2${bcrypt_version}$${bcrypt_cost.toString().padStart(2, '0')}$${salt}`
        }

        // Generate the hash using bcrypt with the custom salt
        const fullHash = await hash(this.password, salt)
        const rawSalt = fullHash.slice(7, 29)
        const b64hash = fullHash.slice(29)
        const saltedpass = `${rawSalt}$${b64hash}`
        return saltedpass
    }
}