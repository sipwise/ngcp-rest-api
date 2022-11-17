export class PasswordSetting {
    allowRecovery: boolean
    maxLength: number
    minLength: number
    digitRequired: boolean
    lowercaseRequired: boolean
    specialCharRequired: boolean
    uppercaseRequired: boolean
    sipAutogenerate: boolean
    sipExposeSubadmin: boolean
    sipValidate: boolean
    webAutogenerate: boolean
    webExposeSubadmin: boolean
    webValidate: boolean

    static fromConfig(config: any): PasswordSetting {
        const settings = new PasswordSetting()
        config = config.security.password

        settings.allowRecovery = config.allow_recovery ?? false
        settings.digitRequired = config.musthave_digit ?? false
        settings.lowercaseRequired = config.musthave_lowercase ?? true
        settings.maxLength = config.max_length ?? 40
        settings.minLength = config.min_length ?? 6
        settings.sipAutogenerate = config.sip_autogenerate ?? false
        settings.sipExposeSubadmin = config.sip_expose_subadmin ?? true
        settings.sipValidate = config.sip_validate ?? false
        settings.specialCharRequired = config.musthave_specialchar ?? false
        settings.uppercaseRequired = config.musthave_uppercase ?? false
        settings.webAutogenerate = config.web_autogenerate ?? false
        settings.webExposeSubadmin = config.web_expose_subadmin ?? true
        settings.webValidate = config.web_validate ?? false

        return settings
    }
}