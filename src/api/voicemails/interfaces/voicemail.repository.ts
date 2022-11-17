import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'

export interface VoicemailRepository {
    readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]>

    read(id: number, sr: ServiceRequest): Promise<internal.Voicemail>

    delete(id: number, sr: ServiceRequest): Promise<number>

    update(id: number, voicemail: internal.Voicemail, sr: ServiceRequest): Promise<internal.Voicemail>
}