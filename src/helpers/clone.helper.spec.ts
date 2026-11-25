import {RewriteRuleRequestDto} from '~/api/rewrite-rules/sets/rules/dto/rule-request.dto'
import {internal} from '~/entities'
import {cloneEntity, cloneOverrides, uniqueCloneName} from '~/helpers/clone.helper'
import {ValidationFailedException} from '~/helpers/errors.helper'

describe('clone.helper', () => {
    describe('cloneOverrides', () => {
        it('has only the given fields, the others stay undefined', async () => {
            const overrides = await cloneOverrides({description: 'x'}, RewriteRuleRequestDto)
            expect(overrides.description).toEqual('x')
            const {description: _description, ...others} = overrides
            expect(Object.values(others).every(value => value === undefined)).toBe(true)
        })

        it('keeps null of an optional field', async () => {
            const overrides = await cloneOverrides({priority: null}, RewriteRuleRequestDto)
            expect(overrides.priority).toBeNull()
        })

        it('rejects null of a required field with its pointer', async () => {
            const err = await cloneOverrides({description: null}, RewriteRuleRequestDto).catch((e: unknown) => e)
            expect(err).toBeInstanceOf(ValidationFailedException)
            expect((err as ValidationFailedException).errorList.every(entry => entry.pointer == '/description')).toBe(true)
        })

        it('has every field undefined for an empty body', async () => {
            const overrides = await cloneOverrides({}, RewriteRuleRequestDto)
            expect(Object.values(overrides).every(value => value === undefined)).toBe(true)
        })
    })

    describe('cloneEntity', () => {
        const source = Object.assign(new internal.RewriteRuleSet(), {
            id: 5,
            resellerId: 1,
            name: 'set',
            description: 'desc',
            callerInDpid: 10,
        })

        it('has no id', () => {
            expect(cloneEntity(source, new internal.RewriteRuleSet()).id).toBeUndefined()
        })

        it('has no field of notCopied', () => {
            const clone = cloneEntity(source, new internal.RewriteRuleSet(), ['name', 'callerInDpid'])
            expect(clone).not.toHaveProperty('name')
            expect(clone).not.toHaveProperty('callerInDpid')
            expect(clone.description).toEqual('desc')
        })

        it('applies the overrides that are not undefined', () => {
            const overrides = Object.assign(new internal.RewriteRuleSet(), {name: 'new', description: null, resellerId: undefined})
            const clone = cloneEntity(source, overrides)
            expect(clone).toMatchObject({name: 'new', description: null, resellerId: 1})
        })

        it('leaves the source unchanged', () => {
            cloneEntity(source, Object.assign(new internal.RewriteRuleSet(), {name: 'new'}), ['description'])
            expect(source).toMatchObject({id: 5, name: 'set', description: 'desc', callerInDpid: 10})
        })

        it('is an instance of the class of the source', () => {
            expect(cloneEntity(source, new internal.RewriteRuleSet())).toBeInstanceOf(internal.RewriteRuleSet)
        })
    })

    describe('uniqueCloneName', () => {
        const readTaken = (taken: string[]): jest.Mock<Promise<string[]>, [string[]]> =>
            jest.fn((candidates: string[]) => Promise.resolve(candidates.filter(name => taken.includes(name))))

        it('is name_clone if nothing is taken', async () => {
            expect(await uniqueCloneName('name', 32, readTaken([]))).toEqual('name_clone')
        })

        it('counts up from 2 for taken names', async () => {
            expect(await uniqueCloneName('name', 32, readTaken(['name_clone']))).toEqual('name_clone2')
            expect(await uniqueCloneName('name', 32, readTaken(['name_clone', 'name_clone2']))).toEqual('name_clone3')
        })

        it('compares the taken names case-insensitively', async () => {
            expect(await uniqueCloneName('name', 32, () => Promise.resolve(['NAME_Clone']))).toEqual('name_clone2')
        })

        it('cuts the name so the result fits the maximum length', async () => {
            const name = 'a'.repeat(32)
            expect(await uniqueCloneName(name, 32, readTaken([]))).toEqual('a'.repeat(26) + '_clone')
            const taken = ['a'.repeat(26) + '_clone'].concat([2, 3, 4, 5, 6, 7, 8, 9].map(i => `${'a'.repeat(26 - 1)}_clone${i}`))
            expect(await uniqueCloneName(name, 32, readTaken(taken))).toEqual('a'.repeat(24) + '_clone10')
        })

        it('is the first candidate if all are taken', async () => {
            const all = ['name_clone'].concat(Array.from({length: 49}, (_, i) => `name_clone${i + 2}`))
            expect(await uniqueCloneName('name', 32, readTaken(all))).toEqual('name_clone')
        })

        it('reads the taken names once, with all candidates', async () => {
            const read = readTaken([])
            await uniqueCloneName('name', 32, read)
            expect(read).toHaveBeenCalledTimes(1)
            expect(read.mock.calls[0][0]).toHaveLength(50)
        })
    })
})
