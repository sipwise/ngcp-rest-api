import type {HLJSApi, LanguageFn, Mode} from 'highlight.js'
import hljsCore from 'highlight.js/lib/core'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import elixir from 'highlight.js/lib/languages/elixir'
import go from 'highlight.js/lib/languages/go'
import http from 'highlight.js/lib/languages/http'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import perl from 'highlight.js/lib/languages/perl'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import typescript from 'highlight.js/lib/languages/typescript'
import MarkdownIt from 'markdown-it'

import {SwaggerLanguage, readLocalisationFile} from '~/helpers/swagger-i18n.helper'

// the chapters in localisation/<lang>/guide, in order, with their tabs (also the address, #concepts) and tab label strings
export const GUIDE_CHAPTERS = [
    {file: 'concepts', tab: 'concepts', label: 'tabConcepts'},
    {file: 'authentication', tab: 'authentication', label: 'tabAuthentication'},
    {file: 'usage', tab: 'usage', label: 'tabUsage'},
]

// fenced code languages that are grouped into tabs, with their labels
export const GUIDE_TAB_LANGUAGES: Record<string, string> = {
    shell: 'curl',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    go: 'Go',
    java: 'Java',
    csharp: 'C#',
    rust: 'Rust',
    c: 'C',
    cpp: 'C++',
    perl: 'Perl',
    elixir: 'Elixir',
}

/**
 * Returns the guide (concepts, authentication, usage) in the language as markdown, used as the OpenAPI
 * description; chapters that are not translated are in english
 */
export function readSwaggerGuide(lang: SwaggerLanguage): string {
    return GUIDE_CHAPTERS
        .map(chapter => readLocalisationFile(lang, `guide/${chapter.file}.md`).trim())
        .join('\n\n')
}

// highlighting by fenced code language
const hljs = hljsCore as HLJSApi
// curl command lines: the command, its options, -X methods, header names, variables and json bodies
const curl: LanguageFn = hljs => {
    const variable: Mode = {scope: 'variable.shell', match: /\$\{?[A-Za-z_]\w*\}?/}
    const headerName = (quote: string): Mode => ({scope: 'name', match: new RegExp(`(?<=${quote})[A-Za-z][\\w-]*:(?=\\s)`)})
    const substitution: Mode = {scope: 'subst', begin: /\$\(/, end: /\)/, contains: []}
    const modes: Mode[] = [
        hljs.HASH_COMMENT_MODE,
        {begin: /'(?=\s*[[{])/, end: /'/, excludeBegin: true, excludeEnd: true, subLanguage: 'json'},
        {scope: 'string', begin: /'/, end: /'/, contains: [headerName('\'')]},
        {scope: 'string', begin: /"/, end: /"/, contains: [headerName('"'), variable, substitution]},
        substitution,
        variable,
        {match: [/-X|--request/, /\s+/, /[A-Z]+\b/], scope: {1: 'option', 3: 'keyword.method'}},
        {scope: 'option', match: /(?<=^|\s)--?[A-Za-z][\w-]*/},
        {scope: 'string', match: /https?:\/\/[^\s'"]+/},
        {scope: 'built_in.curl', match: /\b(?:curl|jq)\b/},
        {scope: 'variable.shell', match: /\b[A-Za-z_]\w*(?==)/},
        {scope: 'comment', match: /\\$/m},
    ]
    substitution.contains = modes
    return {name: 'curl', keywords: {keyword: ['set', 'export', 'for', 'do', 'done', 'if', 'then', 'fi']}, contains: modes}
}

const HIGHLIGHT_LANGUAGES: Record<string, LanguageFn> = {
    shell: curl, javascript, typescript, python, go, java, csharp, rust, c, cpp, perl, elixir, json, http,
}
for (const [name, language] of Object.entries(HIGHLIGHT_LANGUAGES))
    hljs.registerLanguage(name, language)

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Splits the info string of a fenced code block, e.g. "python Basic Auth", into its language and tab label
 */
export function fenceInfo(info: string): {lang: string, label: string} {
    const [lang = '', ...label] = info.trim().split(/\s+/)
    return {lang, label: label.join(' ')}
}

/**
 * Returns the language, the tab label and the highlighted html of every fenced code block of the guide, in order
 */
export function guideCodeBlocks(guide: string): {lang: string, label: string, html: string}[] {
    return new MarkdownIt().parse(guide, {})
        .filter(token => token.type == 'fence')
        .map(token => {
            const {lang, label} = fenceInfo(token.info)
            const html = HIGHLIGHT_LANGUAGES[lang]
                ? hljs.highlight(token.content, {language: lang}).value
                : escapeHtml(token.content)
            return {lang, label, html}
        })
}

// swagger ui renders the description as markdown; the chapters (h2) become collapsible sections and
// adjacent code blocks become tabs: blocks in the tab languages get a language tab and, if labelled
// ("python Basic Auth"), a second row with the labels, the chosen language and label are kept for all
// of them; other labelled blocks ("http return=id") get one tab per label.
// The sanitizer of swagger ui drops classes, so the languages and the highlighted code of the blocks are
// rendered on the server (guideCodeBlocks, in the page data of the language) and applied to the code blocks
// in the same order.
export const swaggerGuideJs = `
(function () {
    const langKey = 'ngcp-api-guide-lang'
    const labelKey = 'ngcp-api-guide-label'
    const page = () => window.ngcpPage || {blocks: [], chapters: []}
    const languages = ${JSON.stringify(GUIDE_TAB_LANGUAGES)}
    const arrow = '<svg width="20" height="20"><use href="#large-arrow-down" xlink:href="#large-arrow-down"></use></svg>'

    // the key of a code block that can be a tab, null otherwise
    function tabKey(node) {
        if (node.tagName != 'PRE' || !(languages[node.dataset.lang] || node.dataset.label))
            return null
        return node.dataset.lang + ' ' + node.dataset.label
    }

    function copyButton(text) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'guide-copy'
        button.textContent = window.ngcpText('copy')
        button.addEventListener('click', () => navigator.clipboard.writeText(text()).then(() => {
            button.textContent = window.ngcpText('copied')
            setTimeout(() => button.textContent = window.ngcpText('copy'), 1500)
        }))
        return button
    }

    function tabButton(className, value, text, select) {
        const tab = document.createElement('button')
        tab.type = 'button'
        tab.className = className
        tab.dataset.value = value
        tab.textContent = text
        tab.setAttribute('role', 'tab')
        // the other groups follow the choice and change their height, the clicked tab stays where it is
        tab.addEventListener('click', () => {
            const top = tab.getBoundingClientRect().top
            select(value)
            window.scrollBy({top: tab.getBoundingClientRect().top - top, behavior: 'instant'})
        })
        return tab
    }

    function refresh() {
        document.querySelectorAll('.swagger-ui .guide-tabs').forEach(group => {
            const panes = [...group.querySelectorAll(':scope > pre')]
            const outers = [...new Set(panes.map(pane => pane.dataset.outer))]
            const wanted = group.dataset.languages ? window.localStorage.getItem(langKey) : group.dataset.active
            const outer = outers.includes(wanted) ? wanted : outers[0]
            const inners = panes.filter(pane => pane.dataset.outer == outer && pane.dataset.inner).map(pane => pane.dataset.inner)
            const wantedInner = window.localStorage.getItem(labelKey)
            const inner = inners.includes(wantedInner) ? wantedInner : inners[0]
            group.querySelectorAll('.guide-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.value == outer)
                tab.setAttribute('aria-selected', tab.dataset.value == outer)
            })
            group.querySelectorAll('.guide-subtab').forEach(tab => {
                tab.hidden = !inners.includes(tab.dataset.value)
                tab.classList.toggle('active', tab.dataset.value == inner)
                tab.setAttribute('aria-selected', tab.dataset.value == inner)
            })
            const subtabs = group.querySelector('.guide-subtabs-bar')
            if (subtabs)
                subtabs.hidden = !inners.length
            panes.forEach(pane => pane.hidden = pane.dataset.outer != outer || (inner && pane.dataset.inner != inner))
        })
    }

    function tabs(pres) {
        const byLanguage = pres.some(pre => languages[pre.dataset.lang])
        const group = document.createElement('div')
        group.className = 'guide-tabs'
        const bar = document.createElement('div')
        bar.className = 'guide-tabs-bar'
        bar.setAttribute('role', 'tablist')
        const subbar = document.createElement('div')
        subbar.className = 'guide-subtabs-bar'
        subbar.setAttribute('role', 'tablist')
        pres[0].before(group)
        group.append(bar)
        const selectOuter = value => {
            if (byLanguage)
                window.localStorage.setItem(langKey, value)
            else
                group.dataset.active = value
            refresh()
        }
        const selectInner = value => {
            window.localStorage.setItem(labelKey, value)
            refresh()
        }
        for (const pre of pres) {
            pre.dataset.outer = byLanguage ? pre.dataset.lang : pre.dataset.label
            pre.dataset.inner = byLanguage ? pre.dataset.label : ''
            if (!bar.querySelector('[data-value="' + pre.dataset.outer + '"]'))
                bar.append(tabButton('guide-tab', pre.dataset.outer, byLanguage ? languages[pre.dataset.lang] : pre.dataset.label, selectOuter))
            if (pre.dataset.inner && !subbar.querySelector('[data-value="' + pre.dataset.inner + '"]'))
                subbar.append(tabButton('guide-subtab', pre.dataset.inner, pre.dataset.inner, selectInner))
            group.append(pre)
        }
        if (byLanguage)
            group.dataset.languages = 'true'
        bar.append(copyButton(() => group.querySelector(':scope > pre:not([hidden]) code').textContent))
        if (subbar.children.length)
            bar.after(subbar)
    }

    const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // the tab of the address, #concepts, #authentication or #usage (#/usage after swagger's deep linking rewrote it),
    // anything else (swagger's #/tag/operation) is the API
    function tabFromHash() {
        const tab = window.location.hash.replace(/^#\\/?/, '')
        return document.querySelector('.swagger-ui .guide-panel[data-tab="' + tab + '"]') ? tab : 'api'
    }

    function showTab(tab) {
        document.documentElement.dataset.guideTab = tab
        document.querySelectorAll('.swagger-ui .guide-nav-tab').forEach(button => {
            button.classList.toggle('active', button.dataset.tab == tab)
            button.setAttribute('aria-selected', button.dataset.tab == tab)
        })
        document.querySelectorAll('.swagger-ui .guide-panel').forEach(panel => panel.hidden = panel.dataset.tab != tab)
    }

    function selectTab(tab) {
        if (tab == 'api')
            window.history.pushState(null, '', window.location.pathname + window.location.search)
        else
            window.history.pushState(null, '', '#' + tab)
        showTab(tab)
    }

    // the chapters (h2) become the tabs Concepts, Authentication and Usage next to API, the swagger operations
    function chapterTabs(markdown) {
        const anchor = document.querySelector('.swagger-ui .scheme-container') || document.querySelector('.swagger-ui .information-container')
        const nav = document.createElement('nav')
        nav.className = 'guide-nav'
        nav.setAttribute('role', 'tablist')
        const panels = document.createElement('div')
        panels.className = 'guide-panels wrapper'
        const addTab = (tab, label) => {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'guide-nav-tab'
            button.dataset.tab = tab
            button.textContent = label
            button.setAttribute('role', 'tab')
            button.addEventListener('click', () => selectTab(tab))
            nav.append(button)
        }
        for (const [i, title] of [...markdown.querySelectorAll(':scope > h2')].entries()) {
            const chapter = page().chapters[i] || {tab: slug(title.textContent), label: title.textContent}
            const label = chapter.label
            const panel = document.createElement('section')
            panel.className = 'guide-panel guide-chapter-body'
            panel.dataset.tab = chapter.tab
            panel.setAttribute('role', 'tabpanel')
            while (title.nextSibling && title.nextSibling.nodeName != 'H2')
                panel.append(title.nextSibling)
            title.remove()
            const sections = [...panel.querySelectorAll(':scope > h3')]
            if (sections.length > 1) {
                const links = document.createElement('div')
                links.className = 'guide-sections'
                for (const heading of sections) {
                    const link = document.createElement('button')
                    link.type = 'button'
                    link.textContent = heading.textContent
                    link.addEventListener('click', () => heading.scrollIntoView({behavior: 'smooth', block: 'start'}))
                    links.append(link)
                }
                panel.prepend(links)
            }
            panels.append(panel)
            addTab(panel.dataset.tab, label)
        }
        addTab('api', window.ngcpText('tabApi'))
        // the tabs share the line of the buttons, the panels follow it
        const buttons = document.querySelector('.swagger-ui .scheme-container .schemes')
        if (buttons)
            buttons.prepend(nav)
        else
            anchor.after(nav)
        anchor.after(panels)
        window.addEventListener('popstate', () => showTab(tabFromHash()))
        window.addEventListener('hashchange', () => showTab(tabFromHash()))
        showTab(tabFromHash())
    }

    function enhance(markdown) {
        markdown.dataset.guide = 'true'
        const pres = markdown.querySelectorAll('pre')
        const blocks = page().blocks
        if (pres.length == blocks.length) {
            pres.forEach((pre, i) => {
                pre.dataset.lang = blocks[i].lang
                pre.dataset.label = blocks[i].label
                pre.querySelector('code').innerHTML = blocks[i].html
            })
        }
        let run = []
        const flush = () => {
            if (run.length > 1)
                tabs(run)
            run = []
        }
        for (const node of [...markdown.children]) {
            const key = tabKey(node)
            if (!key || run.some(pre => tabKey(pre) == key))
                flush()
            if (key)
                run.push(node)
        }
        flush()
        markdown.querySelectorAll(':scope > pre').forEach(pre =>
            pre.append(copyButton(() => pre.querySelector('code').textContent)))
        chapterTabs(markdown)
        refresh()
    }

    new MutationObserver(() => {
        const markdown = document.querySelector('.swagger-ui .info .description .renderedMarkdown:not([data-guide])')
        if (markdown)
            enhance(markdown)
    }).observe(document.body, {childList: true, subtree: true})
})()
`

export const swaggerGuideCss = `
.swagger-ui .scheme-container .schemes {
    background: linear-gradient(rgba(59, 65, 81, .3), rgba(59, 65, 81, .3)) bottom / 100% 1px no-repeat content-box }
html.dark-mode .swagger-ui .scheme-container .schemes {
    background-image: linear-gradient(rgba(228, 230, 230, .25), rgba(228, 230, 230, .25)) }
.swagger-ui .scheme-container .schemes { align-items: flex-end }
.swagger-ui .scheme-container .schemes .auth-wrapper { align-self: center }
.swagger-ui .guide-nav { display: flex; gap: 4px; margin: 0 auto -1px 0 }
.swagger-ui .guide-nav-tab { padding: 10px 18px; border: 0; border-bottom: 3px solid transparent; background: none; color: inherit;
    font: 700 20px sans-serif; opacity: .65; cursor: pointer }
.swagger-ui .guide-nav-tab:hover { opacity: 1 }
.swagger-ui .guide-nav-tab.active { opacity: 1; border-bottom-color: #49cc90 }
html.dark-mode .swagger-ui .guide-nav-tab { color: #e4e6e6 }
html[data-guide-tab]:not([data-guide-tab=api]) .swagger-ui #operations { display: none }
.swagger-ui .opblock-tag a.nostyle :is(span, *) { font-family: sans-serif }
.swagger-ui .opblock-tag a.nostyle span { font-size: 19px }
.swagger-ui .guide-panels { color: #3b4151 }
html.dark-mode .swagger-ui .guide-panels { color: #e4e6e6 }
.swagger-ui .guide-sections { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 32px }
.swagger-ui .guide-sections button { padding: 5px 16px; border: 1px solid rgba(59, 65, 81, .3); border-radius: 18px; background: none;
    color: inherit; font: 600 16px sans-serif; cursor: pointer }
.swagger-ui .guide-sections button:hover { border-color: #49cc90; color: #49cc90 }
html.dark-mode .swagger-ui .guide-sections button { border-color: rgba(228, 230, 230, .3) }
.swagger-ui .guide-panel { padding: 0 0 32px; font-size: 14px; line-height: 1.6 }
.swagger-ui .guide-panel[hidden] { display: none }
.swagger-ui .guide-panels .guide-chapter-body :is(p, li, th, td, h3, h4, strong, a) { font-family: sans-serif }
.swagger-ui .guide-panels .guide-chapter-body h3 { font-size: 18px; margin: 28px 0 8px }
.swagger-ui .guide-panels .guide-chapter-body :is(p, li) { font-size: 14px; margin: 0 0 12px }
.swagger-ui .guide-panels .guide-chapter-body table { border-collapse: collapse; margin: 8px 0 16px }
.swagger-ui .guide-panels .guide-chapter-body table tr :is(th, td) { text-align: left; vertical-align: top; min-width: 0;
    padding: 6px 24px 6px 0; border-bottom: 1px solid rgba(128, 128, 128, .3); font-size: 14px }
.swagger-ui .guide-panels .guide-chapter-body code { font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 400;
    color: inherit; background: rgba(128, 128, 128, .15); border-radius: 3px; padding: 1px 5px }
.swagger-ui .guide-panels .guide-chapter-body pre { position: relative; margin: 8px 0 16px; padding: 14px 16px; overflow-x: auto;
    border-radius: 6px; background: #1f2329; color: #e3e6ea }
.swagger-ui .guide-panels .guide-chapter-body pre code { display: block; padding: 0; background: none; color: inherit;
    font-size: 13px; line-height: 1.5; white-space: pre; tab-size: 4 }
.swagger-ui .guide-panels .guide-chapter-body pre code * { font: inherit }
.swagger-ui .guide-tabs { margin: 8px 0 16px; border-radius: 6px; overflow: hidden; background: #1f2329 }
.swagger-ui .guide-panels .guide-chapter-body .guide-tabs pre { margin: 0; border-radius: 0 }
.swagger-ui .guide-tabs-bar { display: flex; flex-wrap: wrap; align-items: center; padding: 0 8px; border-bottom: 1px solid #353b44 }
.swagger-ui .guide-tab { padding: 9px 10px; border: 0; border-bottom: 2px solid transparent; background: none;
    color: #9aa3ad; font: 600 13px sans-serif; cursor: pointer }
.swagger-ui .guide-tab:hover { color: #fff }
.swagger-ui .guide-tab.active { color: #fff; border-bottom-color: #49cc90 }
.swagger-ui .guide-subtabs-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #353b44 }
.swagger-ui .guide-subtabs-bar[hidden] { display: none }
.swagger-ui .guide-subtab { padding: 2px 10px; border: 1px solid #4a525c; border-radius: 12px; background: none;
    color: #9aa3ad; font: 600 12px sans-serif; cursor: pointer }
.swagger-ui .guide-subtab:hover { color: #fff }
.swagger-ui .guide-subtab.active { color: #fff; border-color: #49cc90; background: rgba(73, 204, 144, .15) }
.swagger-ui .guide-copy { margin-left: auto; padding: 3px 10px; border: 1px solid #4a525c; border-radius: 4px;
    background: none; color: #c9d1d9; font: 12px sans-serif; cursor: pointer }
.swagger-ui .guide-copy:hover { border-color: #9aa3ad; color: #fff }
.swagger-ui .guide-chapter-body pre > .guide-copy { position: absolute; top: 8px; right: 8px; opacity: 0; transition: opacity .2s }
.swagger-ui .guide-chapter-body pre:hover > .guide-copy { opacity: 1 }
.swagger-ui .guide-chapter-body pre :is(.hljs-keyword, .hljs-doctag, .hljs-template-tag) { color: #ff7b72 }
.swagger-ui .guide-chapter-body pre :is(.hljs-title, .hljs-title.function_) { color: #d2a8ff }
.swagger-ui .guide-chapter-body pre :is(.hljs-type, .hljs-built_in, .hljs-symbol) { color: #ffa657 }
.swagger-ui .guide-chapter-body pre .hljs-title.class_ { color: #ffa657 }
.swagger-ui .guide-chapter-body pre :is(.hljs-attr, .hljs-attribute, .hljs-property, .hljs-literal, .hljs-number,
    .hljs-variable) { color: #79c0ff }
.swagger-ui .guide-chapter-body pre :is(.hljs-string, .hljs-regexp) { color: #a5d6ff }
.swagger-ui .guide-chapter-body pre :is(.hljs-meta, .hljs-meta .hljs-keyword) { color: #e3b341 }
.swagger-ui .guide-chapter-body pre .hljs-meta .hljs-string { color: #a5d6ff }
.swagger-ui .guide-chapter-body pre :is(.hljs-comment, .hljs-quote) { color: #8b949e }
.swagger-ui .guide-chapter-body pre .hljs-name { color: #7ee787 }
.swagger-ui .guide-chapter-body pre .hljs-subst { color: #e3e6ea }
.swagger-ui .guide-chapter-body pre .hljs-option { color: #e3b341 }
.swagger-ui .guide-chapter-body pre .hljs-built_in.curl_ { color: #ffa657 }
.swagger-ui .guide-chapter-body pre .hljs-variable.shell_ { color: #d2a8ff }
.swagger-ui .guide-chapter-body pre .hljs-keyword.method_ { font-weight: 600 }
html.dark-mode .swagger-ui .guide-panels .guide-chapter-body pre, html.dark-mode .swagger-ui .guide-tabs { background: #121519 }
html.dark-mode .swagger-ui .guide-panels .guide-chapter-body > pre, html.dark-mode .swagger-ui .guide-tabs { box-shadow: inset 0 0 0 1px #2e343b }
html.dark-mode .swagger-ui .guide-panels .guide-chapter-body pre code { color: #e3e6ea; background: none }
html.dark-mode .swagger-ui .guide-panels .guide-chapter-body code { color: inherit; background: rgba(255, 255, 255, .1) }
`
