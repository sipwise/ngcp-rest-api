import {applyDecorators} from "@nestjs/common";
import {Transform} from "class-transformer";

export function Sensitive() {
    return applyDecorators(
        Transform(({value}) => '\u00AB' + value + '\u00BB')
    )
}

export function GDPRCompliance() {
    return applyDecorators(
        Transform(({value}) => '\u00AB' + value + '\u00BB')
    )
}
