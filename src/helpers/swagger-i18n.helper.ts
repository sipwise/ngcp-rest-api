import {existsSync, readFileSync} from 'fs'
import {join} from 'path'

import {Request} from 'express'

/**
 * Location of the localised swagger page: guide chapters, tag descriptions, page and pdf strings
 *
 * - sources, unit and e2e tests: src/localisation/<lang>
 * - webpack bundle: copied to prod/localisation/<lang> (see webpack.config.js)
 */
const localisationLocation = process.env.NODE_WP_BUNDLE
    ? join(__dirname, 'localisation')
    : join(__dirname, '../localisation')

export const SWAGGER_LANGUAGES = {en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano'}
export type SwaggerLanguage = keyof typeof SWAGGER_LANGUAGES
export const SWAGGER_DEFAULT_LANGUAGE: SwaggerLanguage = 'en'
// a session cookie: the chosen language holds for the browser session, a new one starts in english
export const SWAGGER_LANGUAGE_COOKIE = 'ngcp-api-lang'

export interface SwaggerStrings {
    page: Record<string, string>
    pdf: Record<string, string>
    // the labels of swagger ui by their english text, swagger ui itself has no localisation
    swaggerUi: Record<string, string>
}

export interface SwaggerTag {
    name: string
    description: string
}

export const isSwaggerLanguage = (lang: unknown): lang is SwaggerLanguage =>
    typeof lang == 'string' && Object.hasOwn(SWAGGER_LANGUAGES, lang)

/**
 * The language of the request: ?lang= (swagger.json, .yaml and .pdf), the cookie of the language switch, english
 */
export function swaggerLanguage(req: Request): SwaggerLanguage {
    if (isSwaggerLanguage(req.query?.lang))
        return req.query.lang
    const cookie = (req.headers.cookie ?? '').split(';')
        .map(part => part.trim().split('='))
        .find(([name]) => name == SWAGGER_LANGUAGE_COOKIE)
    return cookie && isSwaggerLanguage(cookie[1]) ? cookie[1] : SWAGGER_DEFAULT_LANGUAGE
}

/**
 * Returns the localisation file of the language, or of english if the language has none
 */
export function readLocalisationFile(lang: SwaggerLanguage, file: string): string {
    const path = join(localisationLocation, lang, file)
    return readFileSync(existsSync(path) ? path : join(localisationLocation, SWAGGER_DEFAULT_LANGUAGE, file), 'utf8')
}

const readJson = <T>(lang: SwaggerLanguage, file: string): T => JSON.parse(readLocalisationFile(lang, file)) as T

/**
 * Returns the tags with their descriptions in the language, english for the ones it does not describe
 */
export function readSwaggerTags(lang: SwaggerLanguage): SwaggerTag[] {
    const tags = readJson<SwaggerTag[]>(SWAGGER_DEFAULT_LANGUAGE, 'swagger-tags.json')
    if (lang == SWAGGER_DEFAULT_LANGUAGE)
        return tags
    const localised = readJson<SwaggerTag[]>(lang, 'swagger-tags.json')
    return tags.map(tag => ({...tag, description: localised.find(t => t.name == tag.name)?.description ?? tag.description}))
}

/**
 * Returns the strings of the swagger page and the pdf in the language, english for the missing ones
 */
export function readSwaggerStrings(lang: SwaggerLanguage): SwaggerStrings {
    const strings = {swaggerUi: {}, ...readJson<Partial<SwaggerStrings>>(SWAGGER_DEFAULT_LANGUAGE, 'swagger-page.json')} as SwaggerStrings
    if (lang == SWAGGER_DEFAULT_LANGUAGE)
        return strings
    const localised = readJson<Partial<SwaggerStrings>>(lang, 'swagger-page.json')
    return {
        page: {...strings.page, ...localised.page},
        pdf: {...strings.pdf, ...localised.pdf},
        swaggerUi: {...strings.swaggerUi, ...localised.swaggerUi},
    }
}

/**
 * Fills the {name} placeholders of a string
 */
export const formatString = (text: string, values: Record<string, string | number>): string =>
    text.replace(/\{(\w+)\}/g, (match, key: string) => key in values ? String(values[key]) : match)

// flags of the languages, 3:2
const FLAGS: Record<SwaggerLanguage, string> = {
    en: '<rect width="30" height="20" fill="#012169"/>'
        + '<path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/>'
        + '<path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/>'
        + '<path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/>'
        + '<path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.5"/>',
    de: '<rect width="30" height="20" fill="#ffce00"/><rect width="30" height="13.34" fill="#dd0000"/>'
        + '<rect width="30" height="6.67" fill="#000"/>',
    fr: '<rect width="30" height="20" fill="#ed2939"/><rect width="20" height="20" fill="#fff"/>'
        + '<rect width="10" height="20" fill="#002395"/>',
    es: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
    it: '<rect width="30" height="20" fill="#ce2b37"/><rect width="20" height="20" fill="#fff"/>'
        + '<rect width="10" height="20" fill="#009246"/>',
}

// between Authorize and the theme switch: the flag of the language, a menu of the languages; choosing one stores
// it in a cookie for a year and reloads the page, which then comes with the document of that language and is
// scrolled back to where it was (the tab is in the address)
export const languageSwitchJs = `
(function () {
    const languages = ${JSON.stringify(SWAGGER_LANGUAGES)}
    const flags = ${JSON.stringify(FLAGS)}
    const flag = lang => '<svg class="flag" width="24" height="16" viewBox="0 0 30 20">' + flags[lang] + '</svg>'
    const scrollKey = 'ngcp-api-lang-scroll'

    function select(lang) {
        document.cookie = '${SWAGGER_LANGUAGE_COOKIE}=' + lang + '; path=/; max-age=31536000; SameSite=Lax'
            + (window.location.protocol == 'https:' ? '; Secure' : '')
        window.sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY)))
        window.location.reload()
    }

    // the page renders after the load, so wait until its height has settled (at most 5s)
    function restoreScroll() {
        const saved = window.sessionStorage.getItem(scrollKey)
        window.sessionStorage.removeItem(scrollKey)
        if (saved === null)
            return
        const y = Number(saved)
        const until = Date.now() + 5000
        let height = 0, stable = 0
        const timer = setInterval(() => {
            const max = document.documentElement.scrollHeight - window.innerHeight
            stable = max == height ? stable + 1 : 0
            height = max
            if ((max >= y && stable >= 3) || Date.now() > until) {
                clearInterval(timer)
                // the title bar shrinks once scrolled; without anchoring it ends up as it was before the reload
                const root = document.documentElement
                root.style.overflowAnchor = 'none'
                window.scrollTo(0, Math.min(y, max))
                setTimeout(() => root.style.overflowAnchor = '', 1000)
            }
        }, 100)
    }

    function addButton() {
        const wrapper = document.querySelector('.swagger-ui .auth-wrapper')
        const theme = wrapper && wrapper.querySelector(':scope > .theme-switch')
        if (!theme || wrapper.querySelector('.language-switch'))
            return
        const current = (window.ngcpPage || {}).lang || '${SWAGGER_DEFAULT_LANGUAGE}'
        const container = document.createElement('div')
        container.className = 'language-switch'
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'btn authorize'
        button.title = window.ngcpText('language') + ': ' + languages[current]
        button.setAttribute('aria-label', button.title)
        button.setAttribute('aria-haspopup', 'menu')
        button.setAttribute('aria-expanded', 'false')
        button.innerHTML = flag(current)
        const menu = document.createElement('div')
        menu.className = 'download-menu language-menu'
        menu.setAttribute('role', 'menu')
        menu.hidden = true
        const open = state => {
            menu.hidden = !state
            button.setAttribute('aria-expanded', state)
        }
        for (const [lang, name] of Object.entries(languages)) {
            const item = document.createElement('button')
            item.type = 'button'
            item.lang = lang
            item.setAttribute('role', 'menuitemradio')
            item.setAttribute('aria-checked', lang == current)
            item.classList.toggle('active', lang == current)
            item.innerHTML = flag(lang) + '<span></span>'
            item.lastChild.textContent = name
            item.addEventListener('click', () => {
                open(false)
                if (lang != current)
                    select(lang)
            })
            menu.append(item)
        }
        button.addEventListener('click', () => open(menu.hidden))
        document.addEventListener('click', e => container.contains(e.target) || open(false))
        document.addEventListener('keydown', e => e.key == 'Escape' && open(false))
        container.append(button, menu)
        wrapper.insertBefore(container, theme)
    }

    new MutationObserver(addButton).observe(document.body, {childList: true, subtree: true})
    restoreScroll()
})()
`

export const languageSwitchCss = `
.swagger-ui .language-switch { position: relative; display: flex }
.swagger-ui .scheme-container .schemes .auth-wrapper .language-switch .btn.authorize { padding-left: 10px; padding-right: 10px }
.swagger-ui .language-switch svg.flag { display: block; border-radius: 2px; box-shadow: 0 0 0 1px rgba(59, 65, 81, .2) }
.swagger-ui .language-menu button { display: flex; align-items: center; gap: 10px }
.swagger-ui .language-menu button.active { color: #49cc90 }
html.dark-mode .swagger-ui .language-menu button.active { color: #49cc90 }
`

// swagger ui has no localisation: its labels are replaced on the page by their exact english text, also when
// it renders them again; only the text of the nodes changes, the nodes stay with react. The descriptions of the
// api (markdown), code, paths, names and inputs are not touched, except the enum and default lines of parameters.
export const swaggerUiTranslateJs = `
(function () {
    const SKIP = '.renderedMarkdown, pre, code, textarea, input, select, .opblock-summary-path, .opblock-summary-description, '
        + '.parameter__name, .parameter__type, .parameter__in, .prop-type, .model-title, .opblock-tag, .info, '
        + '.guide-panels, .guide-nav, .search-box, .download-pdf, .language-switch, .theme-switch, .scroll-top'
    const ALLOW = '.parameter__enum, .parameter__default, .opblock-section-request-body .opblock-title'
    const ATTRIBUTES = ['title', 'aria-label', 'placeholder']
    const labels = () => (window.ngcpPage || {}).swaggerUi || {}
    const skipped = node => node && node.closest(SKIP) && !node.closest(ALLOW)

    function translateText(node, dict) {
        const text = node.data.trim()
        if (!text || !dict[text] || dict[text] == text || skipped(node.parentElement))
            return
        const start = node.data.indexOf(text)
        node.data = node.data.slice(0, start) + dict[text] + node.data.slice(start + text.length)
    }

    function translateAttributes(element, dict) {
        for (const name of ATTRIBUTES) {
            const value = element.getAttribute(name)
            if (value && dict[value] && dict[value] != value && !skipped(element))
                element.setAttribute(name, dict[value])
        }
    }

    function translate(root, dict) {
        if (root.nodeType == Node.TEXT_NODE)
            return translateText(root, dict)
        if (root.nodeType != Node.ELEMENT_NODE)
            return
        translateAttributes(root, dict)
        root.querySelectorAll('[title], [aria-label], [placeholder]').forEach(element => translateAttributes(element, dict))
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        while (walker.nextNode())
            translateText(walker.currentNode, dict)
    }

    // the "required" mark of parameters and request bodies is css content
    let style = null
    function requiredMark(dict) {
        if (style || !dict.required)
            return
        style = document.createElement('style')
        style.textContent = '.swagger-ui .parameter__name.required::after { content: ' + JSON.stringify(dict.required) + ' }'
        document.head.append(style)
    }

    new MutationObserver(records => {
        const dict = labels()
        requiredMark(dict)
        if (!Object.keys(dict).length)
            return
        for (const record of records) {
            if (record.type == 'childList')
                record.addedNodes.forEach(node => translate(node, dict))
            else if (record.type == 'characterData')
                translateText(record.target, dict)
            else
                translateAttributes(record.target, dict)
        }
    }).observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES})
})()
`
