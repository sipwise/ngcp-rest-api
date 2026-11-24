import {Type, applyDecorators} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiOperation, getSchemaPath} from '@nestjs/swagger'

import {oneOrManySchema} from '~/decorators/api-one-or-many-body.decorator'
import {ResponseModel} from '~/decorators/response-model.decorator'

const timeSetCalendarExample = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'NAME:Office hours',
    'BEGIN:VEVENT',
    'UID:office-1',
    'DTSTART;TZID=Europe/Vienna:20261201T080000',
    'DTEND;TZID=Europe/Vienna:20261201T170000',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    'DESCRIPTION:Working days',
    'END:VEVENT',
    'END:VCALENDAR',
].join('\n')

const timeSetDownloadExample = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN',
    'NAME:Office hours',
    'VERSION:2.0',
    '',
    'BEGIN:VEVENT',
    'UID:sipwise15@sipwise9',
    'SUMMARY:Office hours event 15',
    'DTSTART:20261201T080000',
    'DTEND:20261201T170000',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    'DESCRIPTION:Working days',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
].join('\n')

/**
 * Request body of POST events: JSON, or multipart with an iCalendar `file` whose events are appended
 */
export function ApiJsonOrCalendarBody(model: Type<unknown>): MethodDecorator {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOperation({
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: oneOrManySchema(model),
                    },
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['file'],
                            properties: {
                                file: {
                                    type: 'string',
                                    format: 'binary',
                                    description: 'Calendar file (.ics, `text/calendar` or `application/octet-stream`) with the events to add;' +
                                        ' times are converted to the time zone of the platform. Example:\n\n```\n' + timeSetCalendarExample + '\n```',
                                    example: timeSetCalendarExample,
                                },
                            },
                        },
                        encoding: {
                            file: {contentType: 'text/calendar, application/octet-stream'},
                        },
                    },
                },
            },
        }),
    )
}

/**
 * Response of the time set item: JSON, or the iCalendar of the time set with `Accept: text/calendar`
 */
export function ApiTimeSetOkResponse(model: Type<unknown>): MethodDecorator {
    return applyDecorators(
        ResponseModel(model),
        ApiExtraModels(model),
        ApiOkResponse({
            description: 'Time set; with `Accept: text/calendar` its calendar file (.ics) as call routing uses it',
            content: {
                'application/json': {
                    schema: {$ref: getSchemaPath(model)},
                },
                'text/calendar': {
                    schema: {type: 'string', example: timeSetDownloadExample},
                },
            },
        }),
    )
}
