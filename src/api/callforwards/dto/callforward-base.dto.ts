import {ApiProperty} from '@nestjs/swagger'

enum CallForwardMode {
    Whitelist = 'whitelist',
    Blacklist = 'blacklist'
}

class CallForwardSource {
    @ApiProperty({description: 'Source'})
    source!: string
}

class CallForwardDestination {
    @ApiProperty({description: 'Announcement ID'})
    announcement_id: number

    @ApiProperty({description: 'Destination'})
    destination: string

    @ApiProperty({description: 'Priority'})
    priority: number

    @ApiProperty({description: 'Simple destination'})
    simple_destination: string

    @ApiProperty({description: 'timeout'})
    timeout: number
}

class CallForwardTime {
    @ApiProperty({description: 'Hour'})
    hour: string

    @ApiProperty({description: 'Day of the month'})
    mday: string

    @ApiProperty({description: 'Minute'})
    minute: string

    @ApiProperty({description: 'Month'})
    month: string

    @ApiProperty({description: 'Day of the week'})
    wday: string

    @ApiProperty({description: 'Year'})
    year: string
}

class CallForwardBNumber {
    @ApiProperty({description: 'BNumber'})
    bnumber!: string
}

class CallForward {
    @ApiProperty({description: 'Bnumber set'})
    bnumber_set: any // TODO: no definition for this field in v1 OpenAPI

    @ApiProperty({description: 'BNumbers'})
    bnumbers: CallForwardBNumber[]

    @ApiProperty({description: 'BNumbers is regex'})
    bnumbers_is_regex: boolean

    @ApiProperty({description: 'BNumbers mode'})
    bnumbers_mode: CallForwardMode

    @ApiProperty({description: 'Destination set'})
    destination_set: any // TODO: no definition for this field in v1 OpenAPI

    @ApiProperty({description: 'Destinations'})
    destinations: CallForwardDestination[]

    @ApiProperty({description: 'Sources mode'})
    sources_mode: CallForwardMode

    @ApiProperty({description: 'Source set'})
    source_set: any // TODO: no definition for this field in v1 OpenAPI

    @ApiProperty({description: 'Sources'})
    sources: CallForwardSource[]

    @ApiProperty({description: 'Sources is regex'})
    sources_is_regex: boolean

    @ApiProperty({description: 'Time set'})
    time_set: any // TODO: no definition for this field in v1 OpenAPI

    @ApiProperty({description: 'Times'})
    times: CallForwardTime[]
}

class CallForwardTimeout extends CallForward {
    @ApiProperty({description: 'Ring timeout'})
    ringtimeout: number
}

// TODO: translate CF descriptions into proper code
export class CallforwardBaseDto {
    @ApiProperty({
        description: 'Call Forward Unavailable, ' +
            'Contains the keys "destinations", "times" and "sources".' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field.' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year"' +
            '"times" can be empty, then the CF is applied always.' +
            '"sources" is an Array of Objects having one field "source".' +
            '"sources" can be empty.',
    })
    cfna: CallForward

    @ApiProperty({
        description: 'Call Forward on Response, ' +
            'Contains the keys "destinations", "times" and "sources". ' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. "sources" is an Array of Objects having one field "source". "sources" can be empty.',
    })
    cfr: CallForward

    @ApiProperty({
        description: 'Call Forward on Overflow, ' +
            'Contains the keys "destinations", "times" and "sources". ' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. "sources" is an Array of Objects having one field "source". ' +
            '"sources" can be empty.',
    })
    cfo: CallForward

    @ApiProperty({
        description: 'Call Forward Busy, ' +
            'Contains the keys "destinations", "times" and "sources". ' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. "sources" is an Array of Objects having one field "source". ' +
            '"sources" can be empty.',
    })
    cfb: CallForward

    @ApiProperty({
        description: 'Call Forward SMS, ' +
            'Contains the keys "destinations", "times" and "sources". ' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. "sources" is an Array of Objects having one field "source". ' +
            '"sources" can be empty.',
    })
    cfs: CallForward

    @ApiProperty({
        description: 'Call Forward Unconditional, Contains the keys "destinations", "times" and "sources".' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. ' +
            '"sources" is an Array of Objects having one field "source". ' +
            '"sources" can be empty.',
    })
    cfu: CallForward

    @ApiProperty({
        description: 'Call Forward Timeout, ' +
            'Contains the keys "destinations", "times", "sources" and "ringtimeout". ' +
            '"destinations" is an Array of Objects having a "destination", "priority" and "timeout" field. ' +
            '"times" is an Array of Objects having the fields "minute", "hour", "wday", "mday", "month", "year". ' +
            '"times" can be empty, then the CF is applied always. "sources" is an Array of Objects having one field "source". ' +
            '"sources" can be empty.' +
            '"ringtimeout" is a numeric ringing time value in seconds before call forward will be applied.',
    })
    cft: CallForwardTimeout
}
