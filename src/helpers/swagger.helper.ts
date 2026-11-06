import {NestApplication} from '@nestjs/core'
import {DocumentBuilder, OpenAPIObject, ParameterObject, ReferenceObject, ResponseObject, SwaggerModule, getSchemaPath} from '@nestjs/swagger'
import {NextFunction, Request, Response} from 'express'

import {SEARCH_QUERY_ORDER_KEY} from '~/decorators/api-search-query.decorator'
import {ErrorEntryDto, ErrorResponseDto} from '~/dto/error-response.dto'
import {SIPWISE_LOGO_SVG} from '~/helpers/sipwise-logo'
import {swaggerAuthCss, swaggerAuthJs} from '~/helpers/swagger-auth.helper'
import {GUIDE_CHAPTERS, guideCodeBlocks, readSwaggerGuide, swaggerGuideCss, swaggerGuideJs} from '~/helpers/swagger-guide.helper'
import {
    SWAGGER_DEFAULT_LANGUAGE,
    SWAGGER_LANGUAGES,
    SwaggerLanguage,
    languageSwitchCss,
    languageSwitchJs,
    readSwaggerStrings,
    readSwaggerTags,
    swaggerLanguage,
    swaggerUiTranslateJs,
} from '~/helpers/swagger-i18n.helper'
import {renderSwaggerPdf} from '~/helpers/swagger-pdf.helper'
import {swaggerSearchCss, swaggerSearchJs} from '~/helpers/swagger-search.helper'
import {Versions, readVersions} from '~/helpers/swagger-version.helper'
import {LoggerService} from '~/logger/logger.service'

const PDF_FILENAME_PREFIX = 'ngcp-api-2-documentation-'
const PDF_API_ONLY_FILENAME_PREFIX = 'ngcp-api-2-reference-'
const PDF_USAGE_CURL_FILENAME_PREFIX = 'ngcp-api-2-documentation-curl-'

// the extension of the document info with the page data of the language (strings, guide code blocks), only
// in the document of the page (swagger-ui-init.js), not in swagger.json and swagger.yaml
const PAGE_DATA = 'x-ngcp-page'

// takes the page data out of the document (window.ngcpPage, the strings by window.ngcpText) and resets
// auth that might come with the browser
const pageInitJs = `
(function () {
    window.ngcpPage = null
    window.ngcpText = key => ((window.ngcpPage || {}).strings || {})[key] || key
    window.ngcpFormat = (text, values) => text.replace(/\\{(\\w+)\\}/g, (match, key) => key in values ? values[key] : match)
    const swaggerUIBundle = window.SwaggerUIBundle
    window.SwaggerUIBundle = Object.assign(function (options) {
        const info = options.spec && options.spec.info
        if (info && info['${PAGE_DATA}']) {
            window.ngcpPage = info['${PAGE_DATA}']
            delete info['${PAGE_DATA}']
            document.documentElement.lang = window.ngcpPage.lang
        }
        options.onComplete = function () {
            window.ui.preauthorizeBasic('basicAuth', '123', '123')
            window.ui.preauthorizeApiKey('bearerAuth', '123')
        }
        return swaggerUIBundle(options)
    }, swaggerUIBundle)
})()
`

// swagger ui renders after onComplete and may re-render, so the button is added whenever the
// auth wrapper appears without it
const pdfDownloadButtonJs = `
(function () {
    const url = window.location.pathname.replace(/\\/(index\\.html)?$/, '') + '/swagger.pdf'
    const pad = n => String(n).padStart(2, '0')
    const timestamp = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
        + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())

    const variants = [
        {label: 'downloadPdf', query: '', prefix: '${PDF_FILENAME_PREFIX}'},
        {label: 'downloadPdfUsageCurl', query: '&usage=curl', prefix: '${PDF_USAGE_CURL_FILENAME_PREFIX}'},
        {label: 'downloadPdfApiOnly', query: '&api_only=1', prefix: '${PDF_API_ONLY_FILENAME_PREFIX}'},
    ]

    function download(button, variant) {
        const lang = (window.ngcpPage || {}).lang || '${SWAGGER_DEFAULT_LANGUAGE}'
        button.disabled = true
        // the start of the server busts the cache of proxies that keep the pdf for long (nginx on ngcp: 1y)
        fetch(url + '?lang=' + lang + variant.query + '&v=' + ((window.ngcpPage || {}).build || '')).then(res => {
            if (!res.ok)
                throw new Error(res.status + ' ' + res.statusText)
            return res.blob()
        }).then(blob => {
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = variant.prefix + (lang == '${SWAGGER_DEFAULT_LANGUAGE}' ? '' : lang + '-') + timestamp(new Date()) + '.pdf'
            link.click()
            setTimeout(() => URL.revokeObjectURL(link.href), 1000)
        }).catch(err => {
            window.alert(window.ngcpFormat(window.ngcpText('downloadFailed'), {error: err.message}))
        }).finally(() => {
            button.disabled = false
        })
    }

    function addButton() {
        const wrapper = document.querySelector('.swagger-ui .auth-wrapper')
        if (!wrapper || wrapper.querySelector('.download-pdf'))
            return
        const container = document.createElement('div')
        container.className = 'download-pdf'
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'btn authorize'
        button.setAttribute('aria-haspopup', 'menu')
        button.setAttribute('aria-expanded', 'false')
        button.innerHTML = '<span></span>'
            + '<svg width="20" height="20"><use href="#large-arrow-down" xlink:href="#large-arrow-down"></use></svg>'
        button.firstChild.textContent = window.ngcpText('download')
        const menu = document.createElement('div')
        menu.className = 'download-menu'
        menu.setAttribute('role', 'menu')
        menu.hidden = true
        const open = state => {
            menu.hidden = !state
            button.setAttribute('aria-expanded', state)
        }
        for (const variant of variants) {
            const item = document.createElement('button')
            item.type = 'button'
            item.setAttribute('role', 'menuitem')
            item.textContent = window.ngcpText(variant.label)
            item.addEventListener('click', () => {
                open(false)
                download(button, variant)
            })
            menu.append(item)
        }
        button.addEventListener('click', () => open(menu.hidden))
        document.addEventListener('click', e => container.contains(e.target) || open(false))
        document.addEventListener('keydown', e => e.key == 'Escape' && open(false))
        container.append(button, menu)
        wrapper.insertBefore(container, wrapper.firstChild)
    }

    new MutationObserver(addButton).observe(document.body, {childList: true, subtree: true})
})()
`

// the title bar in the style of the admin interface header, with the white Sipwise logo on the left
const headerLogo = `url("data:image/svg+xml,${encodeURIComponent(SIPWISE_LOGO_SVG.replace('<svg ', '<svg fill="#fff" '))}")`
const headerCss = `
.swagger-ui .info .main { display: flex; align-items: center; justify-content: center; height: 50px;
    background: #006600 ${headerLogo} no-repeat 20px calc(50% + 2.5px) / auto 36px }
.swagger-ui .info .main .title, html.dark-mode .swagger-ui .info .main .title { color: #fff; padding: 0 180px;
    font: 700 22px sans-serif; text-transform: uppercase }
.swagger-ui .info .main { position: relative }
.swagger-ui .info .main .ngcp-header-right { position: absolute; top: 50%; right: 20px; transform: translateY(-50%); display: flex;
    align-items: center; gap: 18px; max-width: calc(50% - 210px); color: rgba(255, 255, 255, .85); font: 600 11px/1.3 sans-serif;
    text-align: right }
.swagger-ui .info .main .ngcp-header-right b { font-weight: 700; color: #fff }
.swagger-ui .info .main .ngcp-user { flex: none; max-width: 220px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis }
.swagger-ui .info .main .ngcp-user[hidden] { display: none }
.swagger-ui .info .main .ngcp-versions { min-width: 0 }
.swagger-ui .info .main .ngcp-versions span { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis }
`

// the title bar and the row of tabs and buttons stay on top, the section shortcuts of a guide chapter below them while
// the chapter is in view; once scrolled down the title bar shrinks to a thin strip and the row gets tighter.
// --ngcp-header-height, --ngcp-sticky-height and --ngcp-sections-height (set by stickyHeaderJs) place them and keep
// jump targets (search, section shortcuts, swagger ui) from landing under them
const stickyHeaderCss = `
.swagger-ui .information-container { position: sticky; top: 0; z-index: 31; background: #fafafa }
.swagger-ui .scheme-container, html.dark-mode .swagger-ui .scheme-container { position: sticky; top: var(--ngcp-header-height, 50px);
    z-index: 30; background: #fafafa }
html.dark-mode .swagger-ui .information-container, html.dark-mode .swagger-ui .scheme-container { background: #1c2022 }
.swagger-ui :is(.guide-panel, .opblock-tag-section, .opblock) { scroll-margin-top: calc(var(--ngcp-sticky-height, 112px) + 8px) }
.swagger-ui .guide-panel :is(h3, h4) { scroll-margin-top: calc(var(--ngcp-sticky-height, 112px) + var(--ngcp-sections-height, 0px) + 8px) }
.swagger-ui .guide-sections { position: sticky; top: var(--ngcp-sticky-height, 112px); z-index: 20; margin: 12px 0 24px;
    padding: 8px 0; background: #fafafa; transition: box-shadow .2s }
html.dark-mode .swagger-ui .guide-sections { background: #1c2022 }
html.ngcp-scrolled .swagger-ui .guide-sections { box-shadow: 0 1px 0 rgba(59, 65, 81, .15) }
html.ngcp-scrolled.dark-mode .swagger-ui .guide-sections { box-shadow: 0 1px 0 rgba(228, 230, 230, .15) }
.swagger-ui .info .main { transition: height .2s, background-size .2s, background-position .2s }
.swagger-ui .info .main :is(.title, .ngcp-header-right) { transition: font-size .2s }
html.ngcp-scrolled .swagger-ui .info .main { height: 30px; background-size: auto 21px; background-position: 20px calc(50% + 1.5px) }
html.ngcp-scrolled .swagger-ui .info .main .title, html.ngcp-scrolled.dark-mode .swagger-ui .info .main .title { font-size: 15px }
html.ngcp-scrolled .swagger-ui .info .main .title small { display: none }
html.ngcp-scrolled .swagger-ui .info .main .ngcp-header-right { font-size: 9px; line-height: 1.2 }
.swagger-ui .scheme-container, .swagger-ui .scheme-container :is(.guide-nav-tab, .auth-wrapper .btn.authorize:not(.modal-btn)) {
    transition: padding .2s }
html.ngcp-scrolled .swagger-ui .scheme-container, html.ngcp-scrolled.dark-mode .swagger-ui .scheme-container { padding-top: 0 }
html.ngcp-scrolled .swagger-ui .scheme-container .guide-nav-tab { padding-top: 5px; padding-bottom: 6px }
html.ngcp-scrolled .swagger-ui .scheme-container .schemes .auth-wrapper .btn.authorize:not(.modal-btn) { padding-top: 5px; padding-bottom: 5px }
`

const stickyHeaderJs = `
(function () {
    const root = document.documentElement
    const resize = new ResizeObserver(sync)
    let header = null

    function sync() {
        const row = document.querySelector('.swagger-ui .scheme-container')
        if (!header || !row)
            return
        const sections = document.querySelector('.swagger-ui .guide-panel:not([hidden]) .guide-sections')
        root.style.setProperty('--ngcp-header-height', header.offsetHeight + 'px')
        root.style.setProperty('--ngcp-sticky-height', header.offsetHeight + row.offsetHeight + 'px')
        root.style.setProperty('--ngcp-sections-height', (sections ? sections.offsetHeight : 0) + 'px')
    }

    // two thresholds: shrinking the bar shortens the page, one threshold could flip the state back and forth
    function scrolled() {
        if (window.scrollY > 80)
            root.classList.add('ngcp-scrolled')
        else if (window.scrollY < 10)
            root.classList.remove('ngcp-scrolled')
    }

    // the shortcuts of the shown chapter; a hidden chapter has none, switching tabs resizes them to and from 0
    const observed = new WeakSet()
    new MutationObserver(() => {
        document.querySelectorAll('.swagger-ui .guide-sections').forEach(sections => {
            if (!observed.has(sections)) {
                observed.add(sections)
                resize.observe(sections)
            }
        })
        const current = document.querySelector('.swagger-ui .information-container')
        const row = document.querySelector('.swagger-ui .scheme-container')
        if (!current || !row || current == header)
            return
        header = current
        resize.observe(header)
        resize.observe(row)
        sync()
    }).observe(document.body, {childList: true, subtree: true})
    window.addEventListener('scroll', scrolled, {passive: true})
    scrolled()
})()
`

// the platform release and the package version at the right of the title bar, left of them the user once logged in
// in the Authorize dialog (swagger-auth.helper.ts)
const versionsJs = `
(function () {
    function addVersions() {
        const main = document.querySelector('.swagger-ui .info .main')
        const versions = (window.ngcpPage || {}).versions || {}
        if (!main || main.querySelector('.ngcp-header-right'))
            return
        const right = document.createElement('div')
        right.className = 'ngcp-header-right'
        const user = document.createElement('div')
        user.className = 'ngcp-user'
        user.hidden = true
        const box = document.createElement('div')
        box.className = 'ngcp-versions'
        for (const [label, value, title] of [['NGCP ', versions.ngcp, 'NGCP'], ['', versions.api, 'ngcp-rest-api']]) {
            if (!value)
                continue
            const line = document.createElement('span')
            line.title = title + ' ' + value
            line.append(label, Object.assign(document.createElement('b'), {textContent: value}))
            box.append(line)
        }
        right.append(user, box)
        main.append(right)
        document.dispatchEvent(new Event('ngcp-header'))
    }

    new MutationObserver(addVersions).observe(document.body, {childList: true, subtree: true})
})()
`

// the bundled fonts (public/fonts) on every element, swagger ui's own font rules included, so the page looks the
// same on every system: Arimo for text, JetBrains Mono where swagger ui and the guide use monospace
const MONOSPACE_ELEMENTS = [
    'code', 'pre', 'kbd', 'samp', 'textarea', '.code', '.courier', '.model', 'table.headers td', '.checkbox p',
    '.info .base-url', '.auth-container .errors', '.errors-wrapper .errors h4', '.opblock .opblock-summary-path',
    '.opblock .opblock-summary-path__deprecated', '.opblock .opblock-summary-operation-id', '.parameter__type',
    '.parameter__in', '.parameter__deprecated', '.parameter__extension', '.response__extension',
    '.response-col_status .response-undocumented', '.response-col_links .response-undocumented',
    '.json-schema-2020-12__attribute', '.json-schema-2020-12__constraint', '.json-schema-2020-12-property .json-schema-2020-12__title',
    '.json-schema-2020-12-json-viewer__value--warning', '.json-schema-2020-12-keyword__value--warning',
].join(', ')
const fontsCss = `
.swagger-ui, .swagger-ui * { font-family: Arimo, sans-serif !important }
.swagger-ui :is(${MONOSPACE_ELEMENTS}), .swagger-ui :is(${MONOSPACE_ELEMENTS}) * { font-family: "JetBrains Mono", monospace !important }
.swagger-ui .info .title small pre { font-family: Arimo, sans-serif !important }
.swagger-ui .info .main .title { font-family: "Titillium Web", sans-serif !important }
.swagger-ui :is(.guide-nav-tab, .guide-sections button, .opblock-tag a.nostyle span, .auth-wrapper .btn.authorize:not(.modal-btn), .auth-wrapper .btn.authorize:not(.modal-btn) *,
    .download-menu button) { font-family: "Titillium Web", sans-serif !important; font-weight: 600 !important }
`

// one plain row of buttons under the title bar: Download (with its menu), Authorize and the theme switch
const buttonsCss = `
.swagger-ui .info { margin: 0; text-align: center }
.swagger-ui .info .description { display: none }
.swagger-ui .scheme-container, html.dark-mode .swagger-ui .scheme-container { margin: 0; padding: 8px 0 0; background: none; box-shadow: none }
.swagger-ui .scheme-container .schemes .auth-wrapper { gap: 4px }
.swagger-ui .scheme-container .schemes .auth-wrapper .btn.authorize:not(.modal-btn) { display: flex; align-items: center; gap: 8px; margin: 0;
    padding: 10px 14px; border: 0; background: none; box-shadow: none; color: #3b4151; opacity: .65;
    font: 700 20px sans-serif }
.swagger-ui .scheme-container .schemes .auth-wrapper .btn.authorize:not(.modal-btn):hover { opacity: 1 }
.swagger-ui .scheme-container .schemes .auth-wrapper .btn.authorize:not(.modal-btn) span { float: none; padding: 0; font: inherit }
html.dark-mode .swagger-ui .scheme-container .schemes .auth-wrapper .btn.authorize:not(.modal-btn) { color: #e4e6e6 }
.swagger-ui .auth-wrapper svg { fill: #49cc90 }
.swagger-ui .download-pdf { position: relative }
.swagger-ui .download-pdf .btn:disabled { cursor: wait }
.swagger-ui .download-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 10; min-width: 100%; padding: 4px 0;
    border: 1px solid rgba(59, 65, 81, .2); border-radius: 4px; background: #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, .15) }
.swagger-ui .download-menu[hidden] { display: none }
.swagger-ui .download-menu button { display: block; width: 100%; padding: 8px 16px; border: 0; background: none;
    text-align: left; white-space: nowrap; color: #3b4151; font: 600 16px sans-serif; cursor: pointer }
.swagger-ui .download-menu button:hover { background: rgba(73, 204, 144, .15) }
html.dark-mode .swagger-ui .download-menu { border-color: #3b4151; background: #1c2022 }
html.dark-mode .swagger-ui .download-menu button { color: #e4e6e6 }
.scroll-top { position: fixed; left: min(50% + 722px, 100% - 56px); bottom: 24px; z-index: 100; display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; padding: 0; border: 1px solid rgba(59, 65, 81, .2); border-radius: 50%; background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .2); cursor: pointer; opacity: .85 }
.scroll-top:hover { opacity: 1 }
.scroll-top[hidden] { display: none }
.scroll-top svg { fill: #49cc90 }
html.dark-mode .scroll-top { border-color: #3b4151; background: #1c2022 }
`

// next to the right edge of the content column (swagger's .wrapper: max 1460px, 20px padding)
const scrollTopJs = `
(function () {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'scroll-top'
    button.hidden = true
    button.innerHTML = '<svg width="20" height="20"><use href="#large-arrow-up" xlink:href="#large-arrow-up"></use></svg>'
    button.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}))
    const sync = () => {
        button.hidden = window.scrollY < 400
        button.title = window.ngcpText('top')
        button.setAttribute('aria-label', button.title)
    }
    window.addEventListener('scroll', sync, {passive: true})
    document.body.append(button)
    sync()
})()
`

// the dark mode toggle of swagger ui lives in the hidden topbar and switches to dark on mount when the
// os prefers it, so the stored choice is re-applied on every render and wins over it
const themeSwitchJs = `
(function () {
    const key = 'ngcp-api-swagger-theme'
    const icons = {
        dark: '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>',
        light: '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 '
            + '4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 '
            + '11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 '
            + '0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 '
            + '01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>',
    }
    const isDark = () => document.documentElement.classList.contains('dark-mode')

    function render(button) {
        const next = isDark() ? 'light' : 'dark'
        button.dataset.theme = isDark() ? 'dark' : 'light'
        button.title = window.ngcpText(next == 'dark' ? 'themeDark' : 'themeLight')
        button.setAttribute('aria-label', button.title)
        button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20">' + icons[next] + '</svg>'
    }

    // the last button of the button row, after Authorize
    function addButton() {
        const wrapper = document.querySelector('.swagger-ui .auth-wrapper')
        if (!wrapper || wrapper.querySelector('.theme-switch'))
            return
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'btn authorize theme-switch'
        button.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-mode')
            window.localStorage.setItem(key, isDark() ? 'dark' : 'light')
            render(button)
        })
        render(button)
        wrapper.append(button)
    }

    function sync() {
        const stored = window.localStorage.getItem(key)
        if (stored)
            document.documentElement.classList.toggle('dark-mode', stored == 'dark')
        addButton()
        const button = document.querySelector('.swagger-ui .theme-switch')
        if (button && button.dataset.theme != (isDark() ? 'dark' : 'light'))
            render(button)
    }

    sync()
    new MutationObserver(sync).observe(document.body, {childList: true, subtree: true})
})()
`

// the page is the same for every language, the document of its language (cookie of the language switch) comes
// with swagger-ui-init.js
export function createSwaggerDocument(app: NestApplication, api_prefix: string): void {
    const docBuilder = new DocumentBuilder()
    docBuilder
        .setTitle(readSwaggerStrings(SWAGGER_DEFAULT_LANGUAGE).page.title)
        .setDescription(readSwaggerGuide(SWAGGER_DEFAULT_LANGUAGE))
        .setVersion('2.1')
        .addBasicAuth()
        .addBearerAuth(undefined, 'JWT')
    /* TODO: consider if this needs to be enabled
    .addSecurity('cert', {
        type: 'http',
        scheme: 'cert',
    })
    */

    readSwaggerTags(SWAGGER_DEFAULT_LANGUAGE).forEach(tag => {
        docBuilder.addTag(tag.name, tag.description)
    })

    if (!process.env.NODE_WP_BUNDLE) {
        app.useStaticAssets('./public/css',   {prefix: '/css'})
        app.useStaticAssets('./public/fonts', {prefix: '/fonts'})
    }

    const document = SwaggerModule.createDocument(app, docBuilder.build(), {extraModels: [ErrorResponseDto, ErrorEntryDto]})
    sortSearchQueryParameters(document)
    addErrorResponses(document)
    const versions = readVersions()
    // the start of the server, refers the page to the init script and the pdf of this version
    const build = Date.now().toString(36)
    const documents = localisedDocuments(document, versions, build)
    serveSwaggerPdf(app, api_prefix, documents, versions)
    referInitScriptByLanguage(app, api_prefix, build)
    SwaggerModule.setup(api_prefix, app, document, {
        customCss: `
            .swagger-ui .topbar { display: none }
        ` + fontsCss + headerCss + buttonsCss + swaggerGuideCss + swaggerSearchCss + languageSwitchCss + swaggerAuthCss + stickyHeaderCss,

        customCssUrl: './' + (api_prefix.split('/')[1] ? api_prefix.split('/')[1]+'/' : '') + 'css/swagger-fonts.css',
        customSiteTitle: 'NGCP API 2.1',
        swaggerOptions: {
            dom_id: '#swagger-ui',
            docExpansion: 'none',
            defaultModelsExpandDepth: -1,
            tagsSorter: 'alpha',
            tryItOutEnabled: true,
            supportedSubmitMethods: ['get', 'patch', 'put', 'post', 'delete', 'options', 'head'], // 'trace' is disabled
        },
        // functions in swaggerOptions are serialized with toString(), which returns no source in the
        // bytecode compiled prod bundle, so onComplete is injected as a plain js string instead
        customJsStr: [
            pageInitJs, versionsJs, swaggerAuthJs, stickyHeaderJs, swaggerUiTranslateJs, pdfDownloadButtonJs, themeSwitchJs, languageSwitchJs, swaggerGuideJs, swaggerSearchJs,
            scrollTopJs,
        ],
        jsonDocumentUrl: api_prefix + '/swagger.json',
        yamlDocumentUrl: api_prefix + '/swagger.yaml',
        patchDocumentOnRequest: (req, res) => {
            const request = req as Request
            const lang = swaggerLanguage(request)
            if (!request.path.endsWith('/swagger-ui-init.js'))
                return documents.document(lang)
            // the page document follows the language cookie, so it must not come from the cache
            const response = res as Response
            response.setHeader('Cache-Control', 'no-cache')
            return documents.page(lang)
        },
    })
}

// swagger-ui-init.js carries the document, but proxies may cache javascript for long (nginx on ngcp: expires 1y by
// content type, which replaces its no-cache), so the page, which is not cached, refers to it by language and start
// of the server: a language switch and an upgrade always load the right one
function referInitScriptByLanguage(app: NestApplication, api_prefix: string, build: string): void {
    const pages = ['', '/', '/index.html'].map(page => `/${api_prefix}${page}`)
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method != 'GET' || !pages.includes(req.path))
            return next()
        const send = res.send.bind(res) as Response['send']
        res.send = (body?: unknown): Response => send(typeof body == 'string'
            ? body.replace(/swagger-ui-init\.js"/, `swagger-ui-init.js?lang=${swaggerLanguage(req)}&v=${build}"`)
            : body)
        next()
    })
}

interface LocalisedDocuments {
    // the document in the language: guide, tag descriptions and title
    document(lang: SwaggerLanguage): OpenAPIObject
    // the document with the page data of the language
    page(lang: SwaggerLanguage): OpenAPIObject
}

// the documents are built once per language on first use, they do not change at runtime
function localisedDocuments(document: OpenAPIObject, versions: Versions, build: string): LocalisedDocuments {
    const documents = new Map<SwaggerLanguage, OpenAPIObject>()
    const pages = new Map<SwaggerLanguage, OpenAPIObject>()
    const localised = (lang: SwaggerLanguage): OpenAPIObject => {
        if (lang == SWAGGER_DEFAULT_LANGUAGE)
            return document
        if (!documents.has(lang)) {
            const tags = readSwaggerTags(lang)
            documents.set(lang, {
                ...document,
                info: {...document.info, title: readSwaggerStrings(lang).page.title, description: readSwaggerGuide(lang)},
                tags: document.tags?.map(tag => ({...tag, description: tags.find(t => t.name == tag.name)?.description ?? tag.description})),
            })
        }
        return documents.get(lang)
    }
    return {
        document: localised,
        page: (lang: SwaggerLanguage): OpenAPIObject => {
            if (!pages.has(lang)) {
                const doc = localised(lang)
                const {page: strings, swaggerUi} = readSwaggerStrings(lang)
                const data = {
                    lang,
                    languages: SWAGGER_LANGUAGES,
                    strings,
                    swaggerUi,
                    versions,
                    build,
                    chapters: GUIDE_CHAPTERS.map(chapter => ({tab: chapter.tab, label: strings[chapter.label]})),
                    blocks: guideCodeBlocks(doc.info.description ?? ''),
                }
                pages.set(lang, {...doc, info: {...doc.info, [PAGE_DATA]: data} as OpenAPIObject['info']})
            }
            return pages.get(lang)
        },
    }
}

// the pdf is rendered once per language and variant on the first request
function serveSwaggerPdf(app: NestApplication, api_prefix: string, documents: LocalisedDocuments, versions: Versions): void {
    const log = new LoggerService('swagger')
    // the complete documentation, with ?usage=curl only the curl examples in the usage chapter, or with
    // ?api_only=1 the reference without the guide chapters
    const pdfs = new Map<string, Promise<Buffer>>()
    app.getHttpAdapter().get('/' + api_prefix + '/swagger.pdf', async (req: Request, res: Response) => {
        const apiOnly = req.query.api_only == '1'
        const usage = !apiOnly && req.query.usage == 'curl' ? 'curl' : undefined
        const lang = swaggerLanguage(req)
        const key = `${lang}:${apiOnly}:${usage ?? ''}`
        try {
            if (!pdfs.has(key))
                pdfs.set(key, renderSwaggerPdf(documents.document(lang), {apiOnly, lang, usage, versions}))
            const buffer = await pdfs.get(key)
            const prefix = (apiOnly ? PDF_API_ONLY_FILENAME_PREFIX : usage ? PDF_USAGE_CURL_FILENAME_PREFIX : PDF_FILENAME_PREFIX)
                + (lang == SWAGGER_DEFAULT_LANGUAGE ? '' : `${lang}-`)
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="${prefix}${timestamp()}.pdf"`)
            res.send(buffer)
        } catch (e) {
            pdfs.delete(key)
            log.error(`could not render swagger pdf: ${(e as Error).message}`)
            res.status(500).end()
        }
    })
}

function timestamp(): string {
    const date = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
        + pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds())
}

type OrderedParameter = (ParameterObject | ReferenceObject) & {[SEARCH_QUERY_ORDER_KEY]?: number}

const OPERATION_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const

function sortSearchQueryParameters(document: OpenAPIObject): void {
    const rank = (param: OrderedParameter): number => {
        if ('in' in param && param.in === 'path')
            return -1
        return param[SEARCH_QUERY_ORDER_KEY] ?? Number.MAX_SAFE_INTEGER
    }
    for (const pathItem of Object.values(document.paths)) {
        for (const method of OPERATION_METHODS) {
            const parameters = pathItem[method]?.parameters
            if (!parameters)
                continue
            parameters.sort((a, b) => rank(a) - rank(b))
            parameters.forEach((param: OrderedParameter) => delete param[SEARCH_QUERY_ORDER_KEY])
        }
    }
}

const ERROR_RESPONSES: Record<string, ResponseObject> = {
    '4XX': errorResponse('Client error, see errorCode and errors', {
        statusCode: 422,
        path: '/api/v2/customercontacts/1',
        method: 'PUT',
        error: 'Unprocessable Entity',
        errorCode: 'VALIDATION_FAILED',
        message: 'Validation failed',
        errors: [{pointer: '/status', code: 'isEnum', message: 'status must be one of the following values: active, terminated'}],
    }),
    '5XX': errorResponse('Server error, the details are in the server log under tx', {
        statusCode: 500,
        path: '/api/v2/customercontacts/1',
        method: 'GET',
        error: 'Internal Server Error',
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
    }),
}

function errorResponse(description: string, example: Omit<ErrorResponseDto, 'tx'>): ResponseObject {
    return {
        description,
        content: {
            'application/json': {
                schema: {$ref: getSchemaPath(ErrorResponseDto)},
                example: {tx: '725d5b49f5674d719db795cf2f81262e', ...example},
            },
        },
    }
}

// every error has the same body (HttpExceptionFilter), codes declared by an operation are kept
function addErrorResponses(document: OpenAPIObject): void {
    for (const pathItem of Object.values(document.paths)) {
        for (const method of OPERATION_METHODS) {
            const operation = pathItem[method]
            if (!operation)
                continue
            for (const [code, response] of Object.entries(ERROR_RESPONSES))
                operation.responses[code] ??= response
        }
    }
}
