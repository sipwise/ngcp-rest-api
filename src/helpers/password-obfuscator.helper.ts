export function obfuscatePassword(key, value) {
    const redactedKeys = ['password', 'webpassword']
    if (redactedKeys.includes(key)) {
        return '********'
    }
    return value
}
