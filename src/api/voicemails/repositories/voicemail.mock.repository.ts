import {VoicemailRepository} from '~/api/voicemails/interfaces/voicemail.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface VoicemailMockDB {
    [key: number]: internal.Voicemail
}

export class VoicemailMockRepository implements VoicemailRepository {

    private readonly voicemailDB: VoicemailMockDB

    delete(_ids: number[], _sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve([0])
    }

    read(_id: number, _sr: ServiceRequest): Promise<internal.Voicemail> {
        return Promise.resolve(undefined)
    }

    readAll(_sr: ServiceRequest): Promise<[internal.Voicemail[], number]> {
        return Promise.resolve([[], 0])
    }

    update(_updates: Dictionary<internal.Voicemail>, _sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve(undefined)
    }

}