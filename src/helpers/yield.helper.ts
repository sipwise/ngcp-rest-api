import {setImmediate} from 'node:timers/promises'

const YIELD_AFTER_MS = 5

/**
 * Sequential map over data whose size the client or the database decides. Once
 * YIELD_AFTER_MS passed since the last yield, it awaits a macrotask so that other
 * requests can run; small sets never yield. `fn` may be async for CPU work that
 * only resolves in microtasks (validation); per-item I/O is no job for it.
 */
export async function mapYield<T, R>(
    items: readonly T[],
    fn: (item: T, index: number) => R | Promise<R>,
): Promise<R[]> {
    const results = new Array<R>(items.length)
    let lastYield = performance.now()
    for (let i = 0; i < items.length; i++) {
        if (performance.now() - lastYield > YIELD_AFTER_MS) {
            await setImmediate()
            lastYield = performance.now()
        }
        results[i] = await fn(items[i], i)
    }
    return results
}

export async function forEachYield<T>(
    items: readonly T[],
    fn: (item: T, index: number) => unknown,
): Promise<void> {
    await mapYield(items, fn)
}
