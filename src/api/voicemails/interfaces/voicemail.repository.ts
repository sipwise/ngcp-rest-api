import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface VoicemailRepository {
    readAll(sr: ServiceRequest): Promise<[internal.Voicemail[], number]>

    read(id: number, sr: ServiceRequest): Promise<internal.Voicemail>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    update(updates: Dictionary<internal.Voicemail>, sr: ServiceRequest): Promise<number[]>

    readMaxMsgnumByDir(mailboxuser: string, dir: string, sr: ServiceRequest): Promise<number>

    renumberDir(mailboxuser: string, dir: string, sr: ServiceRequest): Promise<void>
}