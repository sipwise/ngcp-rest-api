import {UnprocessableEntityException} from '@nestjs/common'

import {TimeSetCalendarEvent, parseTimeSetCalendar} from './time-set-calendar.helper'

const vienna = 'Europe/Vienna'

function calendar(...lines: string[]): string {
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\n')
}

function event(...lines: string[]): string {
    return ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\n')
}

async function events(text: string, zone = vienna): Promise<TimeSetCalendarEvent[]> {
    return await parseTimeSetCalendar(text, zone)
}

async function start(dtstart: string, zone = vienna, ...before: string[]): Promise<string> {
    const [parsed] = await events(calendar(...before, event(dtstart)), zone)
    return parsed.start
}

async function rejection(text: string): Promise<{errorCode: string, message: string}> {
    try {
        await parseTimeSetCalendar(text, vienna)
    } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException)
        return (err as UnprocessableEntityException).getResponse() as {errorCode: string, message: string}
    }
    throw new Error('parsed without an error')
}

const windowsZone = [
    'BEGIN:VTIMEZONE',
    'TZID:W. Europe Standard Time',
    'BEGIN:STANDARD',
    'DTSTART:16010101T030000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:16010101T020000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
]

describe('parseTimeSetCalendar', () => {
    describe('text', () => {
        it('reads CRLF and LF line ends', async () => {
            const text = calendar(event('DTSTART:20260701T090000', 'DESCRIPTION:office'))
            const expected = [{start: '2026-07-01 09:00:00', comment: 'office'}]
            expect(await events(text)).toEqual(expected)
            expect(await events(text.replace(/\n/g, '\r\n'))).toEqual(expected)
        })

        it('unfolds folded lines and unescapes text', async () => {
            const [parsed] = await events(calendar(event(
                'DTSTART:20260701T090000',
                'DESCRIPTION:first\\, second\\nthird \\; fo',
                ' lded',
            )))
            expect(parsed.comment).toBe('first, second\nthird ; folded')
        })

        it('takes the SUMMARY if there is no DESCRIPTION', async () => {
            const parsed = await events(calendar(
                event('DTSTART:20260701T090000', 'SUMMARY:summary only'),
                event('DTSTART:20260701T090000', 'SUMMARY:summary', 'DESCRIPTION:description'),
                event('DTSTART:20260701T090000'),
            ))
            expect(parsed.map(item => item.comment)).toEqual(['summary only', 'description', undefined])
        })

        it('ignores VALARM and other components', async () => {
            const parsed = await events(calendar(
                'BEGIN:VTODO', 'DTSTART:20200101T000000', 'END:VTODO',
                'BEGIN:VEVENT', 'DTSTART:20260701T090000', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT',
            ))
            expect(parsed).toEqual([{start: '2026-07-01 09:00:00'}])
        })

        it('reads a calendar without events', async () => {
            expect(await events(calendar('NAME:empty'))).toEqual([])
        })

        it('skips a byte order mark', async () => {
            expect(await events('\uFEFF' + calendar(event('DTSTART:20260701T090000')))).toHaveLength(1)
        })
    })

    describe('times', () => {
        it('keeps floating times', async () => {
            expect(await start('DTSTART:20260701T090000')).toBe('2026-07-01 09:00:00')
            expect(await start('DTSTART:20260701T090000', 'UTC')).toBe('2026-07-01 09:00:00')
        })

        it('keeps a floating time in the gap of the platform zone', async () => {
            expect(await start('DTSTART:20260329T023000')).toBe('2026-03-29 02:30:00')
        })

        it('converts UTC times to the platform zone', async () => {
            expect(await start('DTSTART:20260701T070000Z')).toBe('2026-07-01 09:00:00')
            expect(await start('DTSTART:20261201T080000Z')).toBe('2026-12-01 09:00:00')
            expect(await start('DTSTART:20260701T070000Z', 'UTC')).toBe('2026-07-01 07:00:00')
        })

        it('converts the wall clock of an IANA TZID', async () => {
            expect(await start('DTSTART;TZID=Europe/Vienna:20260701T090000')).toBe('2026-07-01 09:00:00')
            expect(await start('DTSTART;TZID=Europe/Vienna:20260701T090000', 'UTC')).toBe('2026-07-01 07:00:00')
            expect(await start('DTSTART;TZID=America/New_York:20260701T090000')).toBe('2026-07-01 15:00:00')
            expect(await start('DTSTART;TZID=America/New_York:20260701T090000', 'UTC')).toBe('2026-07-01 13:00:00')
            expect(await start('DTSTART;TZID=America/New_York:20261201T090000')).toBe('2026-12-01 15:00:00')
        })

        it('converts the wall clock of a Windows TZID with its VTIMEZONE', async () => {
            expect(await start('DTSTART;TZID=W. Europe Standard Time:20260701T090000', vienna, ...windowsZone)).toBe('2026-07-01 09:00:00')
            expect(await start('DTSTART;TZID=W. Europe Standard Time:20261201T090000', vienna, ...windowsZone)).toBe('2026-12-01 09:00:00')
            expect(await start('DTSTART;TZID=W. Europe Standard Time:20260701T090000', 'UTC', ...windowsZone)).toBe('2026-07-01 07:00:00')
            expect(await start('DTSTART;TZID=W. Europe Standard Time:20261201T090000', 'UTC', ...windowsZone)).toBe('2026-12-01 08:00:00')
        })

        it('resolves the gap and the overlap of a zone as compatible', async () => {
            // 02:30 does not exist on 2026-03-29, it is 03:30 (+02:00); on 2026-10-25 it is the first 02:30 (+02:00)
            expect(await start('DTSTART;TZID=Europe/Vienna:20260329T023000', 'UTC')).toBe('2026-03-29 01:30:00')
            expect(await start('DTSTART;TZID=Europe/Vienna:20260329T023000')).toBe('2026-03-29 03:30:00')
            expect(await start('DTSTART;TZID=Europe/Vienna:20261025T023000', 'UTC')).toBe('2026-10-25 00:30:00')
            expect(await start('DTSTART;TZID=Europe/Vienna:20261025T023000')).toBe('2026-10-25 02:30:00')
        })

        it('converts UTC times at the gap and the overlap of the platform zone', async () => {
            expect(await start('DTSTART:20260329T013000Z')).toBe('2026-03-29 03:30:00')
            expect(await start('DTSTART:20261025T003000Z')).toBe('2026-10-25 02:30:00')
            expect(await start('DTSTART:20261025T013000Z')).toBe('2026-10-25 02:30:00')
        })

        it('reads dates as midnight', async () => {
            const [parsed] = await events(calendar(event(
                'DTSTART;VALUE=DATE:20260701',
                'DTEND;VALUE=DATE:20260702',
                'RRULE:FREQ=DAILY;UNTIL=20260731',
            )), 'UTC')
            expect(parsed).toMatchObject({start: '2026-07-01 00:00:00', end: '2026-07-02 00:00:00', until: '2026-07-31 00:00:00'})
        })

        it('converts DTEND like DTSTART', async () => {
            const [parsed] = await events(calendar(event(
                'DTSTART:20260701T070000Z',
                'DTEND;TZID=America/New_York:20260701T120000',
            )))
            expect(parsed).toMatchObject({start: '2026-07-01 09:00:00', end: '2026-07-01 18:00:00'})
        })
    })

    describe('recurrence', () => {
        it('maps the RRULE parts to the columns', async () => {
            const [parsed] = await events(calendar(event(
                'DTSTART:20260701T090000',
                'DURATION:PT2H30M',
                'RRULE:FREQ=MONTHLY;INTERVAL=2;COUNT=5;BYSECOND=0;BYMINUTE=0,30;BYHOUR=9,17;BYDAY=1MO,-1SU;' +
                    'BYMONTHDAY=1,-1;BYYEARDAY=1,-1;BYWEEKNO=1,-1;BYMONTH=1,7;BYSETPOS=-1;WKST=SU',
            )))
            expect(parsed).toEqual({
                start: '2026-07-01 09:00:00',
                duration: 'PT2H30M',
                freq: 'monthly',
                interval: 2,
                count: 5,
                bysecond: '0',
                byminute: '0,30',
                byhour: '9,17',
                byday: '1MO,-1SU',
                bymonthday: '1,-1',
                byyearday: '1,-1',
                byweekno: '1,-1',
                bymonth: '1,7',
                bysetpos: '-1',
                wkst: 'SU',
            })
        })

        it('maps every WKST', async () => {
            const wkst = await Promise.all(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(async day =>
                (await events(calendar(event('DTSTART:20260701T090000', `RRULE:FREQ=WEEKLY;WKST=${day}`))))[0].wkst))
            expect(wkst).toEqual(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])
        })

        it('converts a UTC UNTIL', async () => {
            const [parsed] = await events(calendar(event('DTSTART:20260701T090000', 'RRULE:FREQ=DAILY;UNTIL=20261231T230000Z')))
            expect(parsed.until).toBe('2027-01-01 00:00:00')
            const [floating] = await events(calendar(event('DTSTART:20260701T090000', 'RRULE:FREQ=DAILY;UNTIL=20261231T230000')))
            expect(floating.until).toBe('2026-12-31 23:00:00')
        })

        it('keeps an RRULE without parts but the frequency', async () => {
            expect((await events(calendar(event('DTSTART:20260701T090000', 'RRULE:FREQ=YEARLY'))))[0]).toEqual({
                start: '2026-07-01 09:00:00',
                freq: 'yearly',
            })
        })
    })

    describe('view output', () => {
        it('reads what v_time_sets_ical writes', async () => {
            const text = [
                'BEGIN:VCALENDAR',
                'PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN',
                'NAME:Office hours',
                'VERSION:2.0',
                'BEGIN:VEVENT',
                'UID:sipwise15@sipwise9',
                'SUMMARY:Office hours event 15',
                'DTSTART:20310303T080000',
                'DTEND:20310303T170000',
                'DESCRIPTION:one',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:sipwise16@sipwise9',
                'SUMMARY:Office hours event 16',
                'DTSTART:20310304T080000',
                'DURATION:PT2H30M',
                'RRULE:FREQ=weekly;COUNT=5;INTERVAL=2;BYDAY=MO,-1FR;WKST=MO',
                'END:VEVENT',
                'END:VCALENDAR',
                '',
            ].join('\n')
            expect(await events(text)).toEqual([
                {start: '2031-03-03 08:00:00', end: '2031-03-03 17:00:00', comment: 'one'},
                {
                    start: '2031-03-04 08:00:00',
                    duration: 'PT2H30M',
                    freq: 'weekly',
                    count: 5,
                    interval: 2,
                    byday: 'MO,-1FR',
                    wkst: 'MO',
                    comment: 'Office hours event 16',
                },
            ])
        })
    })

    describe('errors', () => {
        it('rejects what is no single calendar', async () => {
            for (const text of ['', 'garbage', 'BEGIN:VEVENT\nDTSTART:20260701T090000\nEND:VEVENT', 'BEGIN:VCALENDAR\nVERSION:2.0']) {
                expect(await rejection(text)).toMatchObject({errorCode: 'CALENDAR_MALFORMED'})
            }
            const two = calendar(event('DTSTART:20260701T090000'))
            expect(await rejection(`${two}\n${two}`)).toMatchObject({errorCode: 'CALENDAR_MALFORMED'})
        })

        it.each([
            ['RDATE', 'RDATE:20260702T090000'],
            ['EXDATE', 'EXDATE:20260702T090000'],
            ['EXRULE', 'EXRULE:FREQ=DAILY'],
            ['RECURRENCE-ID', 'RECURRENCE-ID:20260702T090000'],
            ['RRULE', 'RRULE:FREQ=DAILY\nRRULE:FREQ=WEEKLY'],
            ['RRULE BYEASTER', 'RRULE:FREQ=YEARLY;BYEASTER=0'],
        ])('rejects %s and names the property and the event', async (property, line) => {
            const text = calendar(event('UID:abc', 'DTSTART:20260701T090000', line))
            expect(await rejection(text)).toEqual({
                errorCode: 'CALENDAR_UNSUPPORTED_PROPERTY',
                message: `iCalendar property ${property} is not supported (event 'abc')`,
            })
        })

        it('names an event without UID by its position', async () => {
            const text = calendar(event('DTSTART:20260701T090000'), event('DTSTART:20260701T090000', 'RDATE:20260702T090000'))
            expect((await rejection(text)).message).toContain('(event #2)')
        })

        it('rejects an event without DTSTART', async () => {
            expect(await rejection(calendar(event('UID:abc', 'SUMMARY:no start')))).toMatchObject({
                errorCode: 'CALENDAR_MISSING_DTSTART',
                message: 'iCalendar event \'abc\' has no DTSTART',
            })
        })

        it('rejects an unknown timezone', async () => {
            expect(await rejection(calendar(event('UID:abc', 'DTSTART;TZID=Nowhere/Land:20260701T090000')))).toEqual({
                errorCode: 'CALENDAR_UNKNOWN_TIMEZONE',
                message: 'Unknown timezone \'Nowhere/Land\' in DTSTART (event \'abc\')',
            })
            expect(await rejection(calendar(event('DTSTART;TZID=W. Europe Standard Time:20260701T090000')))).toMatchObject({
                errorCode: 'CALENDAR_UNKNOWN_TIMEZONE',
            })
        })

        it('rejects values that are no date', async () => {
            expect(await rejection(calendar(event('UID:abc', 'DTSTART:20260230T090000')))).toEqual({
                errorCode: 'CALENDAR_INVALID_VALUE',
                message: 'Invalid iCalendar value of DTSTART (event \'abc\')',
            })
            expect(await rejection(calendar(event('DTSTART:20260701T090000', 'DTEND;VALUE=DATE:20261301')))).toMatchObject({
                errorCode: 'CALENDAR_INVALID_VALUE',
            })
            expect((await rejection(calendar(event('DTSTART:20260701T090000', 'RRULE:FREQ=DAILY;UNTIL=20260231T000000Z')))).message)
                .toContain('RRULE UNTIL')
        })

        it('rejects an invalid RRULE', async () => {
            expect(await rejection(calendar(event('DTSTART:20260701T090000', 'RRULE:FREQ=FOO')))).toMatchObject({errorCode: 'CALENDAR_MALFORMED'})
        })
    })
})
