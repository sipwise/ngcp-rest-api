export interface SubscriberWebPasswordJournalInterface {
    id?: number
    subscriber_id: number
    value: string
}

export class SubscriberWebPasswordJournal implements SubscriberWebPasswordJournalInterface {
    id: number
    subscriber_id: number
    value: string

    static create(data: SubscriberWebPasswordJournalInterface): SubscriberWebPasswordJournal {
        const journal = new SubscriberWebPasswordJournal()

        Object.keys(data).map(key => {
            journal[key] = data[key]
        })
        return journal
    }
}
