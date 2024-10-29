import {SetMetadata,applyDecorators} from '@nestjs/common'

// We can add more options as needed (e.g skipBanCheck)
interface AuthOptions {
    skipMaxAge: boolean
}

export function AuthOptions(options: AuthOptions): ClassDecorator & MethodDecorator {
    return applyDecorators(
        SetMetadata('skipMaxAge', options.skipMaxAge),
    )
}