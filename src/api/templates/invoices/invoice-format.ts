/**
 * Formatting helpers of the invoice renderer
 */

export class InvoiceTemplateRenderError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InvoiceTemplateRenderError'
    }
}

/**
 * Number of a value, 0 if the value is not a number
 */
export function num(value: unknown): number {
    return Number(value) || 0
}

/**
 * Number to string without floating point noise (184.275 + 14 * 3 does not end up as 226.27500000000003)
 */
export function numToString(n: number): string {
    return String(Number(n.toPrecision(15)))
}

/**
 * Value to string for the output, empty for missing values
 */
export function str(value: unknown): string {
    if (value === undefined || value === null)
        return ''
    if (typeof value == 'number')
        return numToString(value)
    return String(value)
}

// starts with Monday, indexed by the ISO weekday (Monday = 0)
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad2 = (n: number): string => String(n).padStart(2, '0')

/**
 * Formats a unix timestamp (seconds) with a strftime format, the unsupported conversions are kept as they are
 *
 * Supported: %Y %y %m %d %e %H %I %M %S %p %j %a %A %b %B %u %w %F %T %R %D %%
 */
export function formatDate(epoch: unknown, format: string, utc = false): string {
    const date = new Date(num(epoch) * 1000)
    const year = utc ? date.getUTCFullYear() : date.getFullYear()
    const month = utc ? date.getUTCMonth() : date.getMonth()
    const day = utc ? date.getUTCDate() : date.getDate()
    const hour = utc ? date.getUTCHours() : date.getHours()
    const minute = utc ? date.getUTCMinutes() : date.getMinutes()
    const second = utc ? date.getUTCSeconds() : date.getSeconds()
    const weekday = utc ? date.getUTCDay() : date.getDay() // Sunday = 0
    const dayOfYear = Math.round((Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86400000) + 1

    return format.replace(/%([a-zA-Z%])/g, (conversion, c: string) => {
        switch (c) {
            case 'Y': return String(year)
            case 'y': return pad2(year % 100)
            case 'm': return pad2(month + 1)
            case 'd': return pad2(day)
            case 'e': return String(day).padStart(2, ' ')
            case 'H': return pad2(hour)
            case 'I': return pad2(hour % 12 || 12)
            case 'M': return pad2(minute)
            case 'S': return pad2(second)
            case 'p': return hour < 12 ? 'AM' : 'PM'
            case 'j': return String(dayOfYear).padStart(3, '0')
            case 'a': return dayNames[(weekday + 6) % 7].slice(0, 3)
            case 'A': return dayNames[(weekday + 6) % 7]
            case 'b': return monthNames[month].slice(0, 3)
            case 'B': return monthNames[month]
            case 'u': return String(weekday || 7)
            case 'w': return String(weekday)
            case 'F': return `${year}-${pad2(month + 1)}-${pad2(day)}`
            case 'T': return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
            case 'R': return `${pad2(hour)}:${pad2(minute)}`
            case 'D': return `${pad2(month + 1)}/${pad2(day)}/${pad2(year % 100)}`
            case '%': return '%'
            default: return conversion
        }
    })
}
