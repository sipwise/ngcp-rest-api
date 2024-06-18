import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {internal} from '../../../../../entities'

export interface PbxGroupMemberRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PbxGroupMember[], number]>
    readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroupMember>
}