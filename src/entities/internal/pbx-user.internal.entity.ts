import {PrimaryNumber} from '~/types/primary-number.type'

export class PbxUser {
    id: number
    displayName?: string
    pbxExtension: string
    primaryNumber: PrimaryNumber
}