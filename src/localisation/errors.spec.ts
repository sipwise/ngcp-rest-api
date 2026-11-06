import {existsSync, readFileSync, readdirSync} from 'fs'
import {join} from 'path'

/**
 * Returns the keys that occur more than once in the same object of a json text
 * (JSON.parse silently keeps the last one)
 */
function duplicateKeys(text: string): string[] {
    const duplicates: string[] = []
    const objects: Set<string>[] = []
    const containers: string[] = []
    let lastString: string = undefined
    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (c == '"') {
            let end = i + 1
            while (text[end] != '"')
                end += text[end] == '\\' ? 2 : 1
            lastString = JSON.parse(text.slice(i, end + 1))
            i = end
            continue
        }
        if (c == '{') {
            objects.push(new Set())
            containers.push(c)
        } else if (c == '[') {
            containers.push(c)
        } else if (c == '}') {
            objects.pop()
            containers.pop()
        } else if (c == ']') {
            containers.pop()
        } else if (c == ':' && containers[containers.length - 1] == '{') {
            const keys = objects[objects.length - 1]
            if (keys.has(lastString))
                duplicates.push(lastString)
            keys.add(lastString)
        }
    }
    return duplicates
}

describe('errors.json', () => {
    const languages = readdirSync(__dirname).filter(lang => existsSync(join(__dirname, lang, 'errors.json')))

    it('exists for english', () => {
        expect(languages).toContain('en')
    })

    it('finds duplicate keys in a json text', () => {
        expect(duplicateKeys('{"A": {"message": "x"}, "B": {"message": "y", "message": "z"}, "A": {}}')).toEqual(['message', 'A'])
        expect(duplicateKeys('{"A": {"message": "a \\" : b"}, "B": [{"A": 1}, {"A": 2}]}')).toEqual([])
    })

    it.each(languages)('%s has no duplicate keys', lang => {
        const text = readFileSync(join(__dirname, lang, 'errors.json'), 'utf8')
        expect(duplicateKeys(text)).toEqual([])
    })

    it.each(languages)('%s has entries with a message only', lang => {
        const errors = JSON.parse(readFileSync(join(__dirname, lang, 'errors.json'), 'utf8'))
        for (const [key, entry] of Object.entries(errors)) {
            expect(key).toMatch(/^[A-Z0-9][A-Z0-9_]*$/)
            expect(Object.keys(entry)).toEqual(['message'])
        }
    })
})
