import {Module} from '@nestjs/common'

import {TemplateController} from './template.controller'

@Module({
    controllers: [TemplateController],
})
export class TemplateModule {
}
