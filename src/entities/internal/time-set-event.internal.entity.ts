export enum TimeSetEventFreq {
    Secondly = 'secondly',
    Minutely = 'minutely',
    Hourly = 'hourly',
    Daily = 'daily',
    Weekly = 'weekly',
    Monthly = 'monthly',
    Yearly = 'yearly',
}

export class TimeSetEvent {
    id!: number
    timeSetId!: number
    start!: Date
    end?: Date | null
    duration?: string | null
    freq?: TimeSetEventFreq | null
    interval?: number | null
    until?: Date | null
    count?: number | null
    bysecond?: string | null
    byminute?: string | null
    byhour?: string | null
    byday?: string | null
    bymonthday?: string | null
    byyearday?: string | null
    byweekno?: string | null
    bymonth?: string | null
    bysetpos?: string | null
    wkst?: string | null
    comment?: string | null
}
