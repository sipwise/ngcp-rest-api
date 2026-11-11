import {IsBoolean} from 'class-validator'

export class FeaturesConfig {
    @IsBoolean()
        cloudpbx: boolean
}
