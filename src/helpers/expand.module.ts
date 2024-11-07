import {Module} from '@nestjs/common'

import {ExpandHelper} from '~/helpers/expand.helper'

@Module({
    providers: [
        ExpandHelper,
    ],
    exports: [ExpandHelper],
})
export class ExpandModule {}