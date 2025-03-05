import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'

import {CustomerPhonebookOptions} from '~/api/customers/phonebook/interfaces/customer-phonebook-options.interface'
import {CustomerPhonebookRepository} from '~/api/customers/phonebook/interfaces/customer-phonebook.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface CustomerPhonebookMockDB {
    [key: number]: internal.CustomerPhonebook
}

export class CustomerPhonebookMockRepository implements CustomerPhonebookRepository {
    private readonly db: CustomerPhonebookMockDB

    public existingContracts = [1]

    constructor() {
        this.db = {
            1: internal.CustomerPhonebook.create({
                id: 1,
                name: 'test1',
                contractId: 1,
                number: '100',
            }),
            2: internal.CustomerPhonebook.create({
                id: 2,
                name: 'test2',
                contractId: 1,
                number: '200',
            }),
            3: internal.CustomerPhonebook.create({
                id: 3,
                name: 'test3',
                contractId: 1,
                number: '300',
            }),
            4: internal.CustomerPhonebook.create({
                id: 4,
                name: 'test4',
                contractId: 1,
                number: '400',
            }),
            5: internal.CustomerPhonebook.create({
                id: 5,
                name: 'test5',
                contractId: 1,
                number: '500',
            }),
            6: internal.CustomerPhonebook.create({
                id: 6,
                name: 'test6',
                contractId: 1,
                number: '600',
            }),
        }
    }

    create(phonebook: internal.CustomerPhonebook[]): Promise<number[]> {
        for (const p of phonebook) {
            if (!this.existingContracts.includes(p.contractId)) {
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

    readById(id: number, _options: CustomerPhonebookOptions): Promise<internal.CustomerPhonebook> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readWhereInIds(ids: number[], _options: CustomerPhonebookOptions): Promise<internal.CustomerPhonebook[]> {
        const phonebook: internal.CustomerPhonebook[] = []
        for (const i of ids) {
            this.throwErrorIfIdNotExists(i)
            phonebook.push(this.db[i])
        }
        return Promise.resolve(phonebook)
    }

    readAll(_options: CustomerPhonebookOptions, _sr: ServiceRequest): Promise<[internal.CustomerPhonebook[], number]> {
        const phonebook: [internal.CustomerPhonebook[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.CustomerPhonebook), Object.keys(this.db).length]
        return Promise.resolve(phonebook)
    }

    readCountOfIds(ids: number[], _options?: CustomerPhonebookOptions): Promise<number> {
        return Promise.resolve(ids.length)
    }

    update(updates: Dictionary<internal.CustomerPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            if (!this.existingContracts.includes(updates[id].contractId)) {
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
