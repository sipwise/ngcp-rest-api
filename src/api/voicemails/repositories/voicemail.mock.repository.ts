import {VoicemailRepository} from '../interfaces/voicemail.repository'
import {internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'

interface VoicemailMockDB {
    [key: number]: internal.Voicemail
}

export class VoicemailMockRepository implements VoicemailRepository {

    private readonly voicemailDB: VoicemailMockDB

    delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve([0])
    }

    read(id: number, sr: ServiceRequest): Promise<internal.Voicemail> {
        return Promise.resolve(undefined)
    }

    readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return Promise.resolve([[], 0])
    }

    update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve(undefined)
    }

}