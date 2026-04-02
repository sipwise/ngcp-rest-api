export function wildcardStringToRegexp(wildcard: string): RegExp {
    const str =
        '^' + wildcard
            .replace(/\?/g, '.')
            .replace(/\*+/g, '.*')
        + '$'
    return new RegExp(str)
}

export function isWildcardString(search: string): boolean {
    return search.match(/[\\*|\\?]/) ? true : false
}