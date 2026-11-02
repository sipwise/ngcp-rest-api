// search over the operations, the tags and the guide chapters, opened with the Search button next to Download,
// "/" or Ctrl+K; the guide is searched in its prose only, the code examples would flood the results
export const swaggerSearchJs = `
(function () {
    const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    const LIMITS = {tag: 5, operation: 12, guide: 8}
    const GROUPS = [['tag', 'searchTags'], ['operation', 'searchEndpoints'], ['guide', 'searchGuide']]
    let ui = null
    const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'
    const kbd = keys => keys.split('+').map(key => '<kbd>' + key + '</kbd>').join('')

    const el = (tag, className, text) => {
        const node = document.createElement(tag)
        node.className = className
        if (text != null)
            node.textContent = text
        return node
    }

    const textOf = node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        const parts = []
        while (walker.nextNode())
            parts.push(walker.currentNode.data)
        return parts.join(' ').replace(/\\s+/g, ' ').trim()
    }

    // merged [start, end] ranges of the terms in the text, case-insensitive
    function ranges(text, terms) {
        const lower = text.toLowerCase()
        const found = []
        for (const term of terms)
            for (let i = lower.indexOf(term); i >= 0; i = lower.indexOf(term, i + term.length))
                found.push([i, i + term.length])
        found.sort((a, b) => a[0] - b[0])
        const merged = []
        for (const range of found) {
            const last = merged[merged.length - 1]
            if (last && range[0] <= last[1])
                last[1] = Math.max(last[1], range[1])
            else
                merged.push(range)
        }
        return merged
    }

    function marked(text, terms) {
        const fragment = document.createDocumentFragment()
        let pos = 0
        for (const [start, end] of ranges(text, terms)) {
            fragment.append(text.slice(pos, start), el('mark', '', text.slice(start, end)))
            pos = end
        }
        fragment.append(text.slice(pos))
        return fragment
    }

    function snippet(text, terms) {
        const first = ranges(text, terms)[0]
        let start = first ? Math.max(0, first[0] - 50) : 0
        const space = text.indexOf(' ', start)
        if (start && space >= 0 && first && space < first[0])
            start = space + 1
        const end = Math.min(text.length, start + 180)
        return (start ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '')
    }

    function buildIndex() {
        const items = []
        const spec = window.ui && window.ui.specSelectors.specJson().toJS()
        if (spec) {
            for (const tag of spec.tags || [])
                items.push({kind: 'tag', tag: tag.name, title: tag.name, text: tag.description || ''})
            for (const [path, ops] of Object.entries(spec.paths || {}))
                for (const method of METHODS) {
                    const op = ops[method]
                    if (!op)
                        continue
                    const tags = op.tags || ['default']
                    const params = (op.parameters || []).map(param => param.name || '')
                    items.push({kind: 'operation', method, path, tag: tags[0], title: path, summary: op.summary || '',
                        text: [method, op.summary, op.operationId, ...tags, ...params].join(' ')})
                }
        }
        document.querySelectorAll('.swagger-ui .guide-panel').forEach(panel => {
            const tab = document.querySelector('.swagger-ui .guide-nav-tab[data-tab="' + panel.dataset.tab + '"]')
            const chapter = tab ? tab.textContent : panel.dataset.tab
            let section = {kind: 'guide', tab: panel.dataset.tab, chapter, title: chapter, heading: null, nodes: [], text: ''}
            const sections = [section]
            for (const node of panel.children) {
                if (node.nodeName == 'H3' || node.nodeName == 'H4') {
                    section = {kind: 'guide', tab: panel.dataset.tab, chapter, title: node.textContent, heading: node, nodes: [], text: ''}
                    sections.push(section)
                } else if (!node.matches('pre, .guide-sections') && !node.querySelector('pre')) {
                    section.nodes.push(node)
                    section.text += ' ' + textOf(node)
                }
            }
            for (const item of sections) {
                item.text = item.text.trim()
                if (item.heading || item.text)
                    items.push(item)
            }
        })
        return items
    }

    function search(index, terms) {
        const scored = []
        for (const item of index) {
            const title = item.title.toLowerCase()
            const haystack = title + ' ' + item.text.toLowerCase()
            if (!terms.every(term => haystack.includes(term)))
                continue
            let score = 0
            for (const term of terms) {
                if (title.includes(term))
                    score += 3
                if (title.startsWith(term) || title.includes('/' + term))
                    score += 2
            }
            scored.push({item, score})
        }
        scored.sort((a, b) => b.score - a.score)
        return GROUPS.map(([kind, label]) => ({label: window.ngcpText(label), items: scored.filter(s => s.item.kind == kind).slice(0, LIMITS[kind]).map(s => s.item)}))
            .filter(group => group.items.length)
    }

    // swagger ui renders asynchronously, so the target is polled for a while
    function waitFor(find, done, tries = 40) {
        const node = find()
        if (node)
            done(node)
        else if (tries)
            setTimeout(() => waitFor(find, done, tries - 1), 50)
    }

    function selectTab(tab) {
        const button = document.querySelector('.swagger-ui .guide-nav-tab[data-tab="' + tab + '"]')
        if (button && !button.classList.contains('active'))
            button.click()
    }

    const scrollTo = node => setTimeout(() => node.scrollIntoView({behavior: 'smooth', block: 'start'}), 50)

    function openTag(tag, done) {
        selectTab('api')
        waitFor(() => document.querySelector('.swagger-ui .opblock-tag[data-tag="' + CSS.escape(tag) + '"]'), heading => {
            if (!heading.closest('.opblock-tag-section').classList.contains('is-open'))
                heading.click()
            done(heading)
        })
    }

    function openOperation(item) {
        openTag(item.tag, () => waitFor(
            () => [...document.querySelectorAll('.swagger-ui .opblock-' + item.method + ' .opblock-summary-path')]
                .find(path => path.dataset.path == item.path),
            path => {
                const block = path.closest('.opblock')
                if (!block.classList.contains('is-open'))
                    (block.querySelector('.opblock-summary-control') || block.querySelector('.opblock-summary')).click()
                scrollTo(block)
            }))
    }

    // marks the terms in the section for a few seconds, the css fades them out
    function highlight(nodes, terms) {
        const marks = []
        for (const node of nodes) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
            const texts = []
            while (walker.nextNode())
                texts.push(walker.currentNode)
            for (const text of texts) {
                if (!ranges(text.data, terms).length)
                    continue
                const fragment = marked(text.data, terms)
                fragment.querySelectorAll('mark').forEach(mark => {
                    mark.className = 'search-hit'
                    marks.push(mark)
                })
                text.replaceWith(fragment)
            }
        }
        setTimeout(() => marks.forEach(mark => {
            const parent = mark.parentNode
            if (parent) {
                mark.replaceWith(mark.textContent)
                parent.normalize()
            }
        }), 4000)
    }

    function go(item, terms) {
        if (item.kind == 'operation')
            openOperation(item)
        else if (item.kind == 'tag')
            openTag(item.tag, scrollTo)
        else {
            selectTab(item.tab)
            const panel = document.querySelector('.swagger-ui .guide-panel[data-tab="' + item.tab + '"]')
            scrollTo(item.heading || panel)
            highlight(item.heading ? [item.heading, ...item.nodes] : item.nodes, terms)
        }
    }

    function resultRow(item, terms) {
        const row = el('button', 'search-result')
        row.type = 'button'
        row.setAttribute('role', 'option')
        const line = el('div', 'search-line')
        let text = ''
        if (item.kind == 'operation') {
            line.append(el('span', 'search-method search-method-' + item.method, item.method.toUpperCase()))
            line.append(el('span', 'search-title search-path'))
            line.lastChild.append(marked(item.path, terms))
            line.append(el('span', 'search-tag', item.tag))
            text = item.summary
        } else {
            if (item.kind == 'guide')
                line.append(el('span', 'search-chapter', item.chapter))
            line.append(el('span', 'search-title'))
            line.lastChild.append(marked(item.title, terms))
            text = item.kind == 'guide' ? snippet(item.text, terms) : item.text
        }
        row.append(line)
        if (text) {
            row.append(el('div', 'search-text'))
            row.lastChild.append(marked(text, terms))
        }
        return row
    }

    function create(wrapper, download) {
        const box = el('div', 'search-box')
        const button = el('button', 'btn authorize search-button')
        button.type = 'button'
        button.title = window.ngcpFormat(window.ngcpText('searchTitle'), {shortcut})
        button.setAttribute('aria-haspopup', 'listbox')
        button.setAttribute('aria-expanded', 'false')
        button.innerHTML = '<span></span><svg width="20" height="20" viewBox="0 0 20 20">'
            + '<circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke-width="2.2"/>'
            + '<path d="M12.6 12.6l4.6 4.6" stroke-width="2.4" stroke-linecap="round"/></svg>'
        button.firstChild.textContent = window.ngcpText('search')
        const panel = el('div', 'search-panel')
        panel.hidden = true
        const input = el('input', 'search-input')
        input.type = 'search'
        input.placeholder = window.ngcpText('searchPlaceholder')
        input.setAttribute('aria-label', window.ngcpText('search'))
        const list = el('div', 'search-results')
        list.setAttribute('role', 'listbox')
        panel.append(input, list)
        box.append(button, panel)
        wrapper.insertBefore(box, download)

        let index = []
        let rows = []
        let active = -1
        const setActive = i => {
            active = i
            rows.forEach((row, j) => row.node.classList.toggle('active', i == j))
            if (rows[i])
                rows[i].node.scrollIntoView({block: 'nearest'})
        }
        const open = state => {
            panel.hidden = !state
            button.setAttribute('aria-expanded', state)
            if (state) {
                index = buildIndex()
                render()
                input.focus()
                input.select()
            }
        }
        const choose = row => {
            open(false)
            go(row.item, row.terms)
        }
        function render() {
            list.textContent = ''
            rows = []
            const terms = input.value.toLowerCase().split(' ').filter(Boolean)
            if (!terms.length) {
                const hint = el('div', 'search-hint')
                hint.innerHTML = window.ngcpFormat(window.ngcpText('searchTip'),
                    {shortcut: kbd(shortcut), slash: kbd('/'), arrows: kbd('↑') + kbd('↓'), enter: kbd('Enter'), esc: kbd('Esc')})
                list.append(hint)
                return
            }
            const groups = search(index, terms)
            if (!groups.length)
                list.append(el('div', 'search-empty', window.ngcpText('searchEmpty')))
            for (const group of groups) {
                list.append(el('div', 'search-group', group.label))
                for (const item of group.items) {
                    const row = {item, terms, node: resultRow(item, terms)}
                    row.node.addEventListener('click', () => choose(row))
                    row.node.addEventListener('mousemove', () => active != rows.indexOf(row) && setActive(rows.indexOf(row)))
                    rows.push(row)
                    list.append(row.node)
                }
            }
            setActive(rows.length ? 0 : -1)
        }
        input.addEventListener('input', render)
        input.addEventListener('keydown', e => {
            if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
                e.preventDefault()
                if (rows.length)
                    setActive((active + (e.key == 'ArrowDown' ? 1 : rows.length - 1)) % rows.length)
            } else if (e.key == 'Enter' && rows[active]) {
                e.preventDefault()
                choose(rows[active])
            }
        })
        button.addEventListener('click', () => open(panel.hidden))
        return {box, open}
    }

    // after the Download button, so that Search ends up left of it
    function addButton() {
        const wrapper = document.querySelector('.swagger-ui .auth-wrapper')
        const download = wrapper && wrapper.querySelector(':scope > .download-pdf')
        if (download && !wrapper.querySelector('.search-box'))
            ui = create(wrapper, download)
    }

    const typing = target => target.closest && target.closest('input, textarea, select, [contenteditable]')
    document.addEventListener('keydown', e => {
        if (!ui || !document.contains(ui.box))
            return
        if ((e.key == '/' && !typing(e.target)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 'k')) {
            e.preventDefault()
            ui.open(true)
        } else if (e.key == 'Escape')
            ui.open(false)
    })
    document.addEventListener('click', e => ui && !ui.box.contains(e.target) && ui.open(false))

    new MutationObserver(addButton).observe(document.body, {childList: true, subtree: true})
})()
`

export const swaggerSearchCss = `
.swagger-ui .search-box { position: relative }
.swagger-ui .scheme-container .schemes .auth-wrapper .search-button svg { fill: none; stroke: #49cc90 }
.swagger-ui .search-panel { position: absolute; top: calc(100% + 4px); right: 0; z-index: 20; width: min(640px, 90vw);
    border: 1px solid rgba(59, 65, 81, .2); border-radius: 6px; background: #fff; color: #3b4151;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .18); overflow: hidden }
.swagger-ui .search-panel[hidden] { display: none }
.swagger-ui .search-panel input[type=search] { display: block; width: 100%; margin: 0; padding: 12px 16px; border: 0;
    border-bottom: 1px solid rgba(59, 65, 81, .15); border-radius: 0; outline: none; background: none; color: inherit; font-size: 16px }
.swagger-ui .search-results { max-height: min(60vh, 520px); overflow-y: auto }
.swagger-ui .search-results:not(:empty) { padding: 4px 0 8px }
.swagger-ui .search-group { padding: 10px 16px 4px; font-family: "Titillium Web", sans-serif !important; font-size: 13px;
    font-weight: 600; text-transform: uppercase; letter-spacing: .05em; opacity: .55 }
.swagger-ui .search-result { display: block; width: 100%; padding: 6px 16px; border: 0; background: none; color: inherit;
    text-align: left; cursor: pointer }
.swagger-ui .search-result.active { background: rgba(73, 204, 144, .15) }
.swagger-ui .search-line { display: flex; align-items: center; gap: 8px; min-width: 0 }
.swagger-ui .search-title { overflow: hidden; font-size: 14px; font-weight: 700; white-space: nowrap; text-overflow: ellipsis }
.swagger-ui .search-panel .search-path { font-family: "JetBrains Mono", monospace !important; font-size: 13px; font-weight: 600 }
.swagger-ui .search-chapter { flex: none; font-size: 12px; opacity: .55 }
.swagger-ui .search-chapter::after { content: " ›" }
.swagger-ui .search-tag { flex: none; margin-left: auto; font-size: 12px; opacity: .55 }
.swagger-ui .search-text { display: -webkit-box; margin-top: 2px; overflow: hidden; font-size: 13px; line-height: 1.45; opacity: .75;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical }
.swagger-ui .search-method { flex: none; width: 58px; padding: 2px 0; border-radius: 3px; color: #fff; font-size: 11px;
    font-weight: 700; text-align: center }
.swagger-ui .search-method-get { background: #61affe }
.swagger-ui .search-method-post { background: #49cc90 }
.swagger-ui .search-method-put { background: #fca130 }
.swagger-ui .search-method-patch { background: #50e3c2 }
.swagger-ui .search-method-delete { background: #f93e3e }
.swagger-ui .search-method-head, .swagger-ui .search-method-options { background: #9012fe }
.swagger-ui .search-panel mark { padding: 0; border-radius: 2px; background: rgba(252, 161, 48, .35); color: inherit }
.swagger-ui .search-panel kbd { display: inline-block; min-width: 20px; margin: 0 1px; padding: 1px 5px;
    border: 1px solid rgba(59, 65, 81, .3); border-bottom-width: 2px; border-radius: 4px; background: rgba(59, 65, 81, .04);
    font-family: "Titillium Web", sans-serif !important; font-size: 12px; font-weight: 600; line-height: 16px; text-align: center }
html.dark-mode .swagger-ui .search-panel kbd { border-color: rgba(228, 230, 230, .3); background: rgba(228, 230, 230, .06) }
.swagger-ui .search-hint { padding: 12px 16px; font-size: 13px; line-height: 1.9; opacity: .75 }
.swagger-ui .search-empty { padding: 14px 16px; font-size: 14px; opacity: .6 }
.swagger-ui mark.search-hit { padding: 0; border-radius: 2px; color: inherit; animation: search-hit 4s ease-in forwards }
@keyframes search-hit { 0%, 60% { background: rgba(252, 161, 48, .45) } 100% { background: transparent } }
html.dark-mode .swagger-ui .search-panel { border-color: #3b4151; background: #1c2022; color: #e4e6e6 }
html.dark-mode .swagger-ui .search-panel input[type=search] { border-bottom-color: rgba(228, 230, 230, .15) }
`
