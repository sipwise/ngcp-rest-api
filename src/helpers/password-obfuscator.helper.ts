import {ValidationError} from 'class-validator'

const redactedKeys = ['password', 'webpassword']

const redactedQueryParams = new RegExp(`([?&](?:${redactedKeys.join('|')})=)[^&#]*`, 'gi')

export function obfuscatePasswordJSON(key: unknown, value: unknown): unknown {
    if (redactedKeys.includes(key as string)) {
        return '********'
    }
    return value
}

/**
 * Masks `redactedKeys` parameters in the query string of an url
 * @param url url or path with an optional query string
 */
export function obfuscatePasswordUrl(url: string): string {
    return url?.replace(redactedQueryParams, '$1********')
}

/**
 * Returns a copy of the parsed query params with `redactedKeys` masked
 * @param query parsed query params (`req.query`)
 */
export function obfuscatePasswordQuery(query: unknown): unknown {
    return JSON.parse(JSON.stringify(query ?? {}, obfuscatePasswordJSON))
}

/**
 * Masks `redactedKeys` in the target of each error (the whole validated object) and in the value
 * of errors on a redacted property, recursively
 * @param errors array of ValidationError
 */
export function obfuscatePasswordValidationErrors(errors: ValidationError[]): void {
    for (const error of errors ?? []) {
        const target = error.target as Record<string, unknown>
        if (target) {
            for (const key of redactedKeys) {
                if (key in target)
                    target[key] = '*******'
            }
        }
        if (redactedKeys.includes(error.property))
            error.value = '*******'
        obfuscatePasswordValidationErrors(error.children)
    }
}