import {Module} from '@nestjs/common'

import {RewriteRuleController} from './rewrite-rule.controller'

@Module({
    controllers: [RewriteRuleController],
})
export class RewriteRuleModule {
}
