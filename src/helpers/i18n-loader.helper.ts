import {I18nJsonLoader, I18nTranslation} from 'nestjs-i18n'

/**
 * Json loader that sets `errorCode` of every `errors.json` entry to its key, so the bodies of
 * `i18n.t('errors.<KEY>')` carry the code in every language
 */
export class I18nErrorCodeLoader extends I18nJsonLoader {
    protected async parseTranslations(eventInfo?: {event: string, filePath: string}): Promise<I18nTranslation> {
        const translations = await super.parseTranslations(eventInfo)
        for (const lang of Object.keys(translations)) {
            const entries = translations[lang]?.['errors']
            if (entries == null || typeof entries != 'object')
                continue
            for (const [key, entry] of Object.entries(entries)) {
                if (entry != null && typeof entry == 'object')
                    entry['errorCode'] = key
            }
        }
        return translations
    }
}
