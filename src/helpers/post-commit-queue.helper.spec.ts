import {postCommitQueueStorage, runOnTransactionCommit, runOnceOnTransactionCommit} from './post-commit-queue.helper'

describe('post-commit queue', () => {
    const noop = (): void => undefined

    it('queues every callback', () => {
        const store = {callbacks: []}
        postCommitQueueStorage.run(store, () => {
            runOnTransactionCommit(noop)
            runOnTransactionCommit(noop)
        })
        expect(store.callbacks).toHaveLength(2)
    })

    it('queues a keyed callback once per queue', () => {
        const store = {callbacks: []}
        const first = (): void => undefined
        postCommitQueueStorage.run(store, () => {
            runOnceOnTransactionCommit('reload', first)
            runOnceOnTransactionCommit('reload', noop)
            runOnceOnTransactionCommit('other', noop)
        })
        expect(store.callbacks).toStrictEqual([first, noop])
    })

    it('starts every queue without keys', () => {
        const stores = [{callbacks: []}, {callbacks: []}]
        for (const store of stores)
            postCommitQueueStorage.run(store, () => runOnceOnTransactionCommit('reload', noop))
        expect(stores.map(store => store.callbacks.length)).toStrictEqual([1, 1])
    })

    it('throws outside of a queue', () => {
        expect(() => runOnTransactionCommit(noop)).toThrow()
        expect(() => runOnceOnTransactionCommit('reload', noop)).toThrow()
    })
})
