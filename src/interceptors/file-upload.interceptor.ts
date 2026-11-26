import {CallHandler, ExecutionContext, NestInterceptor, PayloadTooLargeException, Type, mixin} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {Observable} from 'rxjs'

import {errorMessage} from '~/helpers/errors.helper'
import {formatSize} from '~/helpers/request-limits.helper'

/**
 * FileInterceptor with a size limit whose 413 names the limit (FILE_TOO_LARGE); no maxSize = unlimited
 */
export function FileUploadInterceptor(field: string, maxSize?: number): Type<NestInterceptor> {
    class FileUploadMixinInterceptor implements NestInterceptor {
        private readonly upload = new (FileInterceptor(field, {limits: {fileSize: maxSize}}))()

        async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
            try {
                return await this.upload.intercept(context, next)
            } catch (err) {
                if (maxSize && err instanceof PayloadTooLargeException)
                    throw new PayloadTooLargeException(errorMessage('FILE_TOO_LARGE', {max: formatSize(maxSize)}))
                throw err
            }
        }
    }
    return mixin(FileUploadMixinInterceptor)
}
