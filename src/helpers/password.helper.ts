import {randomInt} from 'crypto'

import bcrypt from 'bcryptjs'

/**
 * Salted bcrypt hash in the NGCP form `<22 chars salt>$<hash>`
 */
export async function saltedPassword(password: string, cost: number = 13, salt?: string): Promise<string> {
    const bcryptSalt = salt
        ? `$2b$${cost.toString().padStart(2, '0')}$${salt}`
        : await bcrypt.genSalt(cost)
    const hash = await bcrypt.hash(password, bcryptSalt)
    return `${hash.slice(7, 29)}$${hash.slice(29)}`
}

export async function passwordJournalHash(password: string): Promise<string> {
    return saltedPassword(password, 6)
}

export async function isPasswordInJournal(password: string, hashes: string[]): Promise<boolean> {
    for (const value of hashes) {
        const [salt, hash] = value.split('$')
        if ((await saltedPassword(password, 6, salt)).split('$')[1] === hash)
            return true
    }
    return false
}

const lowercase = 'abcdefghijklmnopqrstuvwxyz'
const uppercase = lowercase.toUpperCase()
const digits = '0123456789'
// without <, > and &
const special = '!"#$%\'()*+,-./:;=?@[\\]^_`{|}~'

/**
 * Random password with at least three characters of each class (lowercase, uppercase, digit, special)
 */
export function generatePassword(length: number): string {
    const pick = (chars: string): string => chars[randomInt(chars.length)]
    const all = lowercase + uppercase + digits + special
    const chars: string[] = []
    for (const set of [lowercase, uppercase, digits, special])
        chars.push(pick(set), pick(set), pick(set))
    while (chars.length < Math.max(length, 12))
        chars.push(pick(all))
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1)
        const swap = chars[i]
        chars[i] = chars[j]
        chars[j] = swap
    }
    return chars.join('')
}
