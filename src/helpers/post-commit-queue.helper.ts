import {AsyncLocalStorage} from 'async_hooks'

interface PostCommitQueueStore {
    callbacks: Array<() => void | Promise<void>>
}

export const postCommitQueueStorage = new AsyncLocalStorage<PostCommitQueueStore>()

export function runOnTransactionCommit(cb: () => void | Promise<void>): void {
    const store = postCommitQueueStorage.getStore()
    if (!store) {
        throw new Error(
            'runOnTransactionCommit() called outside of a @Transactional() request - there is no active post-commit queue',
        )
    }
    store.callbacks.push(cb)
}
