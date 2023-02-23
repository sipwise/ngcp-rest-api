import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {internal} from '../../../entities'
import {Dictionary} from '../../../helpers/dictionary.helper'

export interface NCOSSetRepository {
    create(sd: internal.NCOSSet, sr: ServiceRequest): Promise<internal.NCOSSet>

    readAll(sr: ServiceRequest): Promise<[internal.NCOSSet[], number]>

    readById(id: number, sr: ServiceRequest): Promise<internal.NCOSSet>

    update(updates: Dictionary<internal.NCOSSet>, sr: ServiceRequest): Promise<number[]>

    delete(ids: number[], sr: ServiceRequest): Promise<number[]>

    createLevel(sd: internal.NCOSSetLevel, sr: ServiceRequest): Promise<internal.NCOSSetLevel>

    readLevelAll(sr: ServiceRequest, id?: number): Promise<[internal.NCOSSetLevel[], number]>

    readLevelById(id: number, levelId: number, sr: ServiceRequest): Promise<internal.NCOSSetLevel>

    deleteLevel(id: number, levelId: number, sr: ServiceRequest): Promise<number>

}