import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PbxGroupMemberRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PbxGroupMember[], number]>
    readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroupMember>
}