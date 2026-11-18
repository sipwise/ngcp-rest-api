import {forEachYield, mapYield} from '~/helpers/yield.helper'

describe('yield.helper', () => {
    let now: number

    // every performance.now() call advances the clock by `step` ms
    function mockClock(step: number): void {
        now = 0
        jest.spyOn(performance, 'now').mockImplementation(() => now += step)
    }

    // records per item whether a macrotask queued before the call has run yet
    function macrotaskSeen(): () => boolean {
        let ran = false
        setImmediate(() => ran = true)
        return (): boolean => ran
    }

    afterEach(() => {
        jest.restoreAllMocks()
        jest.useRealTimers()
    })

    describe('mapYield', () => {
        it('keeps order, indexes and results', async () => {
            const result = await mapYield(['a', 'b', 'c'], (item, index) => `${index}:${item}`)
            expect(result).toEqual([
                '0:a',
                '1:b',
                '2:c',
            ])
        })

        it('returns an empty array for no items', async () => {
            expect(await mapYield([], (item: number) => item)).toEqual([])
        })

        it('does not yield while the budget is not used up', async () => {
            mockClock(0)
            const seen = macrotaskSeen()
            const result = await mapYield(Array.from({length: 1000}, (_, i) => i), () => seen())
            expect(result.every(ran => !ran)).toBe(true)
        })

        it('yields once the budget passed and goes on', async () => {
            mockClock(2)
            const seen = macrotaskSeen()
            const result = await mapYield([1, 2, 3, 4, 5], (item) => ({item, ran: seen()}))
            expect(result.map(r => r.item)).toEqual([1, 2, 3, 4, 5])
            expect(result[0].ran).toBe(false)
            expect(result[4].ran).toBe(true)
        })

        it('awaits async callbacks one after the other', async () => {
            mockClock(2)
            const seen = macrotaskSeen()
            const started: number[] = []
            const result = await mapYield([1, 2, 3, 4, 5], async (item) => {
                started.push(item)
                await Promise.resolve()
                return {item, started: started.length, ran: seen()}
            })
            expect(result.map(r => r.started)).toEqual([1, 2, 3, 4, 5])
            expect(result[0].ran).toBe(false)
            expect(result[4].ran).toBe(true)
        })

        it('works with fake timers', async () => {
            jest.useFakeTimers()
            mockClock(10)
            const result = await mapYield([1, 2, 3], (item) => item * 2)
            expect(result).toEqual([2, 4, 6])
        })
    })

    describe('forEachYield', () => {
        it('visits every item in order', async () => {
            mockClock(3)
            const visited: string[] = []
            await forEachYield(['a', 'b', 'c'], (item, index) => visited.push(`${index}:${item}`))
            expect(visited).toEqual([
                '0:a',
                '1:b',
                '2:c',
            ])
        })
    })
})
