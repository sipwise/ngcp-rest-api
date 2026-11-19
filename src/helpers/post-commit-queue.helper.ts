import {AsyncLocalStorage} from 'async_hooks'

interface PostCommitQueueStore {
    callbacks: Array<() => void | Promise<void>>
    keys?: Set<string>
}

export const postCommitQueueStorage = new AsyncLocalStorage<PostCommitQueueStore>()

export function runOnTransactionCommit(cb: () => void | Promise<void>): void {
    getStore().callbacks.push(cb)
}

/**
 * Queues cb only if no callback with the same key is queued yet, e.g. one reload for all changes of a request
 */
export function runOnceOnTransactionCommit(key: string, cb: () => void | Promise<void>): void {
    const store = getStore()
    store.keys ??= new Set()
    if (store.keys.has(key))
        return
    store.keys.add(key)
    store.callbacks.push(cb)
}

function getStore(): PostCommitQueueStore {
    const store = postCommitQueueStorage.getStore()
    if (!store) {
        throw new Error(
            'post-commit callback queued outside of a @Transactional() request - there is no active post-commit queue',
        )
    }
    return store
}
