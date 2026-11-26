const innerIntercept = jest.fn()
jest.mock('@nestjs/platform-express', () => ({
    FileInterceptor: jest.fn(() => class {
        intercept = innerIntercept
    }),
}))

import {CallHandler, ExecutionContext, HttpStatus, NestInterceptor, PayloadTooLargeException} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {of} from 'rxjs'

import {FileUploadInterceptor} from '~/interceptors/file-upload.interceptor'

describe('FileUploadInterceptor', () => {
    const context = {} as ExecutionContext
    const next = {} as CallHandler
    let interceptor: NestInterceptor

    beforeEach(() => {
        innerIntercept.mockReset()
        interceptor = new (FileUploadInterceptor('file', 1024))()
    })

    it('passes the size limit to multer', () => {
        expect(FileInterceptor).toHaveBeenCalledWith('file', {limits: {fileSize: 1024}})
    })

    it('returns the observable of the upload', async () => {
        const observable = of('done')
        innerIntercept.mockResolvedValue(observable)
        expect(await interceptor.intercept(context, next)).toBe(observable)
    })

    it('rejects a file above the limit with 413 FILE_TOO_LARGE naming the limit', async () => {
        innerIntercept.mockRejectedValue(new PayloadTooLargeException())
        await expect(interceptor.intercept(context, next)).rejects.toThrow(expect.objectContaining({
            status: HttpStatus.PAYLOAD_TOO_LARGE,
            response: {errorCode: 'FILE_TOO_LARGE', message: 'The file is larger than the 1kb allowed'},
        }))
    })

    it('passes other errors through unchanged', async () => {
        const error = new Error('unexpected')
        innerIntercept.mockRejectedValue(error)
        await expect(interceptor.intercept(context, next)).rejects.toBe(error)
    })
})
