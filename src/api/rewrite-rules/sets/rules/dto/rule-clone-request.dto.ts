import {PartialType} from '@nestjs/swagger'

import {RewriteRuleRequestDto} from './rule-request.dto'

export class RewriteRuleCloneRequestDto extends PartialType(RewriteRuleRequestDto) {}
