import {OpenAPIObject} from '@nestjs/swagger'

import {plainText, primaryRef, renderSwaggerPdf, schemaLabel} from '~/helpers/swagger-pdf.helper'

const document: OpenAPIObject = {
    openapi: '3.0.0',
    info: {title: 'Test API', version: '2.0'},
    tags: [{name: 'Admin', description: '[/admins] Administrative users'}],
    paths: {
        '/api/admins': {
            get: {
                tags: ['Admin'],
                summary: 'List admins',
                parameters: [
                    {name: 'page', in: 'query', required: false, schema: {type: 'number', default: 1}},
                    {name: 'role', in: 'query', required: false, schema: {type: 'string', enum: ['admin', 'reseller']}},
                ],
                responses: {
                    200: {
                        description: 'the admins',
                        content: {'application/json': {schema: {
                            allOf: [
                                {$ref: '#/components/schemas/PaginatedDto'},
                                {properties: {data: {type: 'array', items: {$ref: '#/components/schemas/AdminResponseDto'}}}},
                            ],
                        }}},
                    },
                },
            },
            post: {
                tags: ['Admin'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {schema: {type: 'array', items: {$ref: '#/components/schemas/AdminResponseDto'}}},
                        'multipart/form-data': {schema: {
                            type: 'object',
                            properties: {file: {type: 'string', format: 'binary', description: 'CSV file (`text/csv`)'}},
                        }},
                    },
                },
                responses: {201: {description: ''}},
            },
        },
        '/api/untagged': {
            delete: {responses: {204: {description: 'deleted'}}, security: []},
        },
    },
    components: {
        schemas: {
            PaginatedDto: {type: 'object', properties: {total_count: {type: 'number'}}, required: ['total_count']},
            AdminResponseDto: {
                type: 'object',
                properties: {
                    id: {type: 'number', readOnly: true},
                    login: {type: 'string', maxLength: 255},
                    contact: {type: 'object', properties: {email: {type: 'string', nullable: true}}},
                },
                required: ['id', 'login'],
            },
        },
    },
}

describe('swagger-pdf.helper', () => {
    describe('schemaLabel', () => {
        it('returns readable types', () => {
            expect(schemaLabel({$ref: '#/components/schemas/AdminResponseDto'})).toBe('AdminResponseDto')
            expect(schemaLabel({type: 'array', items: {$ref: '#/components/schemas/AdminResponseDto'}})).toBe('AdminResponseDto[]')
            expect(schemaLabel({type: 'string', format: 'date-time'})).toBe('string <date-time>')
            expect(schemaLabel({type: 'array'})).toBe('array')
            expect(schemaLabel({oneOf: [{type: 'string'}, {type: 'number'}]})).toBe('string | number')
            expect(schemaLabel(undefined)).toBe('')
        })

        it('returns the data item of a paginated response', () => {
            const schema = document.paths['/api/admins'].get.responses[200]['content']['application/json'].schema
            expect(schemaLabel(schema)).toBe('PaginatedDto & {data: AdminResponseDto[]}')
            expect(primaryRef(schema)).toBe('AdminResponseDto')
        })
    })

    describe('plainText', () => {
        it('strips markdown markup', () => {
            expect(plainText('CSV file (`text/csv`), **e.g.**:\n```\nfoo,bar\n```')).toBe('CSV file (text/csv), e.g.:\nfoo,bar')
            expect(plainText(undefined)).toBe('')
        })
    })

    describe('renderSwaggerPdf', () => {
        it('renders a pdf', async () => {
            const pdf = await renderSwaggerPdf(document)
            expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
            expect(pdf.length).toBeGreaterThan(1000)
        })

        it('renders a document without paths and schemas', async () => {
            const pdf = await renderSwaggerPdf({openapi: '3.0.0', info: {title: 'Empty', version: '1'}, paths: {}})
            expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
        })

        it('renders the markdown description as guide chapters', async () => {
            const description = [
                '## Concepts', 'Send `Accept: application/json` with **every** request, see [RFC 6902](https://example.com).',
                '### Paging', '| Parameter | Meaning |', '| --- | --- |', '| `page` | Page number |',
                '- first item', '- second item',
                '## Usage', '### List', '```shell', 'curl "$NGCP_URL/admins"', '```', '```python', 'print("a" * 200)', '```',
            ].join('\n')
            const withGuide = await renderSwaggerPdf({...document, info: {...document.info, description}})
            const withoutGuide = await renderSwaggerPdf(document)
            expect(withGuide.subarray(0, 5).toString()).toBe('%PDF-')
            expect(withGuide.length).toBeGreaterThan(withoutGuide.length)
        })

        it('keeps only the curl examples with usage curl', async () => {
            const guide = (...code: string[]): OpenAPIObject => ({...document, info: {...document.info, description: [
                '## Usage', '### List', '```shell Basic Auth', 'curl "$NGCP_URL/admins"', '```', ...code,
                '```http return=id', 'Prefer: return=id', '```',
            ].join('\n')}})
            const python = ['```python Basic Auth', ...Array(40).fill('print("a" * 100)'), '```']
            const full = await renderSwaggerPdf(guide(...python))
            const curlOnly = await renderSwaggerPdf(guide(...python), {usage: 'curl'})
            const withoutPython = await renderSwaggerPdf(guide())
            expect(curlOnly.length).toBeLessThan(full.length)
            expect(curlOnly.length).toEqual(withoutPython.length)
        })
    })
})
