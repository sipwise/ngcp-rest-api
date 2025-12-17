import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'

import {SubscriberPhonebookOptions} from '~/api/subscribers/phonebook/interfaces/subscriber-phonebook-options.interface'
import {SubscriberPhonebookRepository} from '~/api/subscribers/phonebook/interfaces/subscriber-phonebook.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface SubscriberPhonebookMockDB {
    [key: number]: internal.SubscriberPhonebook
}

export class SubscriberPhonebookMockRepository implements SubscriberPhonebookRepository {
    private readonly db: SubscriberPhonebookMockDB

    public existingSubscribers = [1]

    constructor() {
        this.db = {
            1: internal.SubscriberPhonebook.create({
                id: 1,
                name: 'test1',
                subscriberId: 1,
                number: '100',
                shared: true,
            }),
            2: internal.SubscriberPhonebook.create({
                id: 2,
                name: 'test2',
                subscriberId: 1,
                number: '200',
                shared: true,
            }),
            3: internal.SubscriberPhonebook.create({
                id: 3,
                name: 'test3',
                subscriberId: 1,
                number: '300',
                shared: true,
            }),
            4: internal.SubscriberPhonebook.create({
                id: 4,
                name: 'test4',
                subscriberId: 1,
                number: '400',
                shared: true,
            }),
            5: internal.SubscriberPhonebook.create({
                id: 5,
                name: 'test5',
                subscriberId: 1,
                number: '500',
                shared: true,
            }),
            6: internal.SubscriberPhonebook.create({
                id: 6,
                name: 'test6',
                subscriberId: 1,
                number: '600',
                shared: true,
            }),
        }
    }

    create(phonebook: internal.SubscriberPhonebook[]): Promise<number[]> {
        for (const p of phonebook) {
            if (!this.existingSubscribers.includes(p.subscriberId)) {
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

    readById(id: number, _options: SubscriberPhonebookOptions): Promise<internal.SubscriberPhonebook> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readWhereInIds(ids: number[], _options: SubscriberPhonebookOptions): Promise<internal.SubscriberPhonebook[]> {
        const phonebook: internal.SubscriberPhonebook[] = []
        for (const i of ids) {
            this.throwErrorIfIdNotExists(i)
            phonebook.push(this.db[i])
        }
        return Promise.resolve(phonebook)
    }

    readAll(_options: SubscriberPhonebookOptions, _sr: ServiceRequest): Promise<[internal.SubscriberPhonebook[], number]> {
        const phonebook: [internal.SubscriberPhonebook[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.SubscriberPhonebook), Object.keys(this.db).length]
        return Promise.resolve(phonebook)
    }

    readCountOfIds(ids: number[], _options?: SubscriberPhonebookOptions): Promise<number> {
        return Promise.resolve(ids.length)
    }

    update(updates: Dictionary<internal.SubscriberPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            if (!this.existingSubscribers.includes(updates[id].subscriberId)) {
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

    getAllowedSubscribersCount(_ids: number[], _filterBy: SubscriberPhonebookOptions['filterBy'], _sr: ServiceRequest): Promise<number> {
        return Promise.resolve(1)
    }
}
