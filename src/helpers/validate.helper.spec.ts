import {Type, plainToInstance} from 'class-transformer'
import {ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested, validate as classValidatorValidate} from 'class-validator'

import {formatValidationErrors} from '~/helpers/errors.helper'
import {plainToInstanceInChunks, validateInChunks} from '~/helpers/validate.helper'

class Item {
    @IsInt()
    @Min(1)
        n: number
}

class Parent {
    @IsString()
        name: string

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => Item)
        items?: Item[]

    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @Min(0, {each: true})
        ids?: number[]

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(1500)
        capped?: number[]
}

const options = {whitelist: true, forbidNonWhitelisted: true}

async function bothErrors(plain: object): Promise<[string, string]> {
    const chunked = await validateInChunks(plainToInstance(Parent, plain), options)
    const whole = await classValidatorValidate(plainToInstance(Parent, plain), options)
    return [JSON.stringify(formatValidationErrors(chunked)), JSON.stringify(formatValidationErrors(whole))]
}

describe('validate.helper', () => {
    afterEach(() => jest.restoreAllMocks())

    describe('validateInChunks', () => {
        it('reports the errors of large arrays as one validation of the whole object', async () => {
            const items = Array.from({length: 2600}, (_, i) => i % 700 == 3 ? {n: -i, extra: 1} : {n: i + 1})
            const ids = Array.from({length: 2600}, (_, i) => i == 2 ? 1.5 : i == 2400 ? -1 : i)
            const [chunked, whole] = await bothErrors({unknown: 1, name: 5, items, ids, capped: Array(1600).fill(1)})
            expect(JSON.parse(chunked).length).toBe(13)
            expect(chunked).toBe(whole)
        })

        it('reports no errors for valid large arrays', async () => {
            const items = Array.from({length: 1200}, (_, i) => ({n: i + 1}))
            const [chunked, whole] = await bothErrors({name: 'a', items, ids: items.map(item => item.n)})
            expect(chunked).toBe('[]')
            expect(chunked).toBe(whole)
        })

        it('keeps the large arrays and strips nothing else from the object', async () => {
            const items = Array.from({length: 1200}, (_, i) => ({n: i + 1}))
            const parent = plainToInstance(Parent, {name: 'a', items})
            await validateInChunks(parent, options)
            expect(parent.items).toHaveLength(1200)
            expect(parent.items[1199]).toBeInstanceOf(Item)
        })

        it('yields to the event loop between chunks', async () => {
            let now = 0
            jest.spyOn(performance, 'now').mockImplementation(() => now += 10)
            let ran = false
            setImmediate(() => ran = true)
            const parent = plainToInstance(Parent, {name: 'a', items: Array.from({length: 1200}, () => ({n: 1}))})
            await validateInChunks(parent, options)
            expect(ran).toBe(true)
        })
    })

    describe('plainToInstanceInChunks', () => {
        it('transforms large arrays as one plainToInstance of the whole body', async () => {
            const items = Array.from({length: 1200}, (_, i) => ({n: i + 1, ...(i == 700 ? {extra: 1} : {})}))
            const json = JSON.stringify({name: 'a', unknown: 1, items, ids: items.map(item => item.n)})
                .replace('{', '{"__proto__": {"x": 1}, "constructor": 2, ')
            const chunked = await plainToInstanceInChunks(Parent, JSON.parse(json))
            expect(chunked).toStrictEqual(plainToInstance(Parent, JSON.parse(json)))
            expect(chunked.items).toHaveLength(1200)
            expect(chunked.items.every(item => item instanceof Item)).toBe(true)
        })

        it.each([
            ['a primitive', 5],
            ['null', null],
            ['an array', [{name: 'a'}, {name: 'b'}]],
            ['a small body', {name: 'a', items: [{n: 1}], ids: [1]}],
        ])('transforms %s as plainToInstance', async (_, plain) => {
            expect(await plainToInstanceInChunks(Parent, plain)).toStrictEqual(plainToInstance(Parent, plain))
        })

        it('yields to the event loop between chunks', async () => {
            let now = 0
            jest.spyOn(performance, 'now').mockImplementation(() => now += 10)
            let ran = false
            setImmediate(() => ran = true)
            await plainToInstanceInChunks(Parent, {name: 'a', items: Array.from({length: 1200}, () => ({n: 1}))})
            expect(ran).toBe(true)
        })
    })
})
