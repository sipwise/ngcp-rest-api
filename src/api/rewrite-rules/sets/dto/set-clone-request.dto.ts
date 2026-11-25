import {ApiPropertyOptional, OmitType, PartialType} from '@nestjs/swagger'

import {RewriteRuleSetRequestDto} from './set-request.dto'

export class RewriteRuleSetCloneRequestDto extends PartialType(OmitType(RewriteRuleSetRequestDto, ['rules'] as const)) {
    // the validators come from the request dto, only the description differs
    @ApiPropertyOptional({
        description: 'Reseller of the copy, the reseller of the source if missing. Reseller roles must not send it, the copy gets their own reseller',
        example: 1,
    })
        reseller_id?: number
}
