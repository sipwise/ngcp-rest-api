import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'

import {ResellerPhonebookOptions} from '~/api/resellers/phonebook/interfaces/reseller-phonebook-options.interface'
import {ResellerPhonebookRepository} from '~/api/resellers/phonebook/interfaces/reseller-phonebook.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface ResellerPhonebookMockDB {
    [key: number]: internal.ResellerPhonebook
}

export class ResellerPhonebookMockRepository implements ResellerPhonebookRepository {
    private readonly db: ResellerPhonebookMockDB

    public existingResellers = [1]

    constructor() {
        this.db = {
            1: internal.ResellerPhonebook.create({
                id: 1,
                name: 'test1',
                resellerId: 1,
                number: '100',
            }),
            2: internal.ResellerPhonebook.create({
                id: 2,
                name: 'test2',
                resellerId: 1,
                number: '200',
            }),
            3: internal.ResellerPhonebook.create({
                id: 3,
                name: 'test3',
                resellerId: 1,
                number: '300',
            }),
            4: internal.ResellerPhonebook.create({
                id: 4,
                name: 'test4',
                resellerId: 1,
                number: '400',
            }),
            5: internal.ResellerPhonebook.create({
                id: 5,
                name: 'test5',
                resellerId: 1,
                number: '500',
            }),
            6: internal.ResellerPhonebook.create({
                id: 6,
                name: 'test6',
                resellerId: 1,
                number: '600',
            }),
        }
    }

    create(phonebook: internal.ResellerPhonebook[]): Promise<number[]> {
        for (const p of phonebook) {
            if (!this.existingResellers.includes(p.resellerId)) {
                throw new UnprocessableEntityException()
            }
        }
        const nextId = this.getNextId()
        phonebook[0].id = nextId
        this.db[nextId] = phonebook[0]

        return Promise.resolve([nextId])
    }

    delete(ids: number[]): Promise<number[]> {
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
        }
        return Promise.resolve(ids)
    }

    readById(id: number, _options: ResellerPhonebookOptions): Promise<internal.ResellerPhonebook> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readWhereInIds(ids: number[], _options: ResellerPhonebookOptions): Promise<internal.ResellerPhonebook[]> {
        const phonebook: internal.ResellerPhonebook[] = []
        for (const i of ids) {
            this.throwErrorIfIdNotExists(i)
            phonebook.push(this.db[i])
        }
        return Promise.resolve(phonebook)
    }

    readAll(_options: ResellerPhonebookOptions, _sr: ServiceRequest): Promise<[internal.ResellerPhonebook[], number]> {
        const phonebook: [internal.ResellerPhonebook[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.ResellerPhonebook), Object.keys(this.db).length]
        return Promise.resolve(phonebook)
    }

    readCountOfIds(ids: number[], _options?: ResellerPhonebookOptions): Promise<number> {
        return Promise.resolve(ids.length)
    }

    update(updates: Dictionary<internal.ResellerPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            if (!this.existingResellers.includes(updates[id].resellerId)) {
                throw new UnprocessableEntityException()
            }
            this.throwErrorIfIdNotExists(id)
            this.db[id] = updates[id]
        }
        return Promise.resolve(ids)
    }

    private getNextId(): number {
        const keys = Object.keys(this.db)
        return (+keys[keys.length - 1]) + 1
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}
