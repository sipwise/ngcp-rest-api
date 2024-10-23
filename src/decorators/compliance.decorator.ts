import {applyDecorators} from '@nestjs/common'
import {Transform} from 'class-transformer'

export function Sensitive(): MethodDecorator {
    return applyDecorators(
        Transform(({value}) => '\u00AB' + value + '\u00BB'),
    )
}

export function GDPRCompliance(): MethodDecorator {
    return applyDecorators(
        Transform(({value}) => '\u00AB' + value + '\u00BB'),
    )
}
