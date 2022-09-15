import {VoicemailsRepository} from '../interfaces/voicemails.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'

interface VoicemailsMockDB {
    [key: number]: internal.Voicemail
}

export class VoicemailsMockRepository implements VoicemailsRepository {

    private readonly voicemailsDB: VoicemailsMockDB

    delete(id: number, sr: ServiceRequest): Promise<number> {
        return Promise.resolve(0)
    }

    read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        return Promise.resolve(undefined)
    }

    readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return Promise.resolve([[], 0])
    }

    update(id: number, voicemail: internal.Voicemail, sr: ServiceRequest): Promise<internal.Voicemail> {
        return Promise.resolve(undefined)
    }

}