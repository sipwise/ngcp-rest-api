export class Dictionary<T> {
    [key: string]: T

    constructor(id?: string, value?: T) {
        if (id)
            this[id] = value
    }
}