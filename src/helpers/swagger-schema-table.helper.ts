// the Schema tab of request bodies and responses as one flat table of the fields instead of swagger ui's model
// tree: nested objects as dotted paths (primary_number.cc), arrays with [] (alias_numbers[].cc). The items of a
// collection, of the answer of a POST and of a body keyed by id get a table of their own after the envelope.
// The Schema tab comes first and is shown by default. A swagger ui plugin (window.ngcpSchemaTablePlugin), registered
// by pageInitJs in swagger.helper.ts; it reads the unresolved document, which keeps the names of the referenced
// schemas
export const swaggerSchemaTableJs = `
(function () {
    const MAX_DEPTH = 4
    // lazy fields are this link or their data; the link is described in Concepts, only the data is unfolded
    const LAZY_LINK = 'LazyFieldLink'
    const TICK = '\\x60'
    const text = key => window.ngcpText(key)
    const format = (key, values) => window.ngcpFormat(text(key), values)

    let spec = null
    let schemas = {}

    function loadSpec(system) {
        const json = system.specSelectors.specJson()
        if (json !== spec) {
            spec = json
            const components = json.getIn(['components', 'schemas'])
            schemas = components ? components.toJS() : {}
        }
    }

    const refName = schema => schema.$ref ? schema.$ref.slice(schema.$ref.lastIndexOf('/') + 1) : null
    // a reference with nullable or a description of its own is a single allOf
    const named = schema => refName(schema) || (schema.allOf && schema.allOf.length == 1 ? refName(schema.allOf[0]) : null)
    const resolve = schema => named(schema) ? schemas[named(schema)] || {} : schema
    const shortName = name => name.replace(/(Request|Response)?Dto$/, '')
    const captionOf = schema => schema.type == 'array' ? '[' + captionOf(schema.items || {}) + ']' : named(schema) || typeLabel(schema)

    function typeLabel(schema) {
        const nullable = schema.nullable ? '|null' : ''
        const name = named(schema)
        if (name)
            return shortName(name) + nullable
        if (schema.oneOf)
            return schema.oneOf.map(typeLabel).join('|') + nullable
        if (schema.type == 'array') {
            const items = typeLabel(schema.items || {})
            return (items.includes('|') ? '(' + items + ')' : items) + '[]' + nullable
        }
        if (schema.type == 'string' && schema.format)
            return schema.format + nullable
        return (schema.type || (schema.properties ? 'object' : 'any')) + nullable
    }

    // the same details as the pdf (schemaDetails in swagger-pdf.helper.ts); nullable is in the type
    function details(schema) {
        const value = v => typeof v == 'string' ? v : JSON.stringify(v)
        const parts = schema.description ? [schema.description.replace(/\\.$/, '')] : []
        const values = (schema.enum || []).filter(v => v !== null)
        if (values.length)
            parts.push(format('schemaOneOf', {values: values.map(value).join(', ')}))
        if (schema.default !== undefined && schema.default !== '')
            parts.push(format('schemaDefault', {value: value(schema.default)}))
        for (const key of ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern']) {
            if (schema[key] !== undefined)
                parts.push(format('schema' + key[0].toUpperCase() + key.slice(1), {value: value(schema[key])}))
        }
        if (schema.readOnly)
            parts.push(text('schemaReadOnly'))
        return parts.join('; ')
    }

    const row = (field, schema, required) => ({field, type: typeLabel(schema), required, details: details(schema)})

    // the fields of an object, nested objects and arrays of objects below their field; references already on the
    // path are not unfolded again (cycles), resolved expand fields are other resources and named by type only
    function fieldRows(schema, prefix, depth, seen, rows) {
        const required = schema.required || []
        for (const [key, property] of Object.entries(schema.properties || {})) {
            rows.push(row(prefix + key, property, required.includes(key)))
            if (depth < MAX_DEPTH && !key.endsWith('_expand'))
                nestedRows(property, prefix + key, depth + 1, seen, rows)
        }
        return rows
    }

    function nestedRows(property, path, depth, seen, rows) {
        for (const branch of property.oneOf || [property]) {
            const array = branch.type == 'array'
            const target = array ? branch.items || {} : branch
            const name = named(target)
            if (name && (name == LAZY_LINK || seen.includes(name)))
                continue
            fieldRows(resolve(target), path + (array ? '[].' : '.'), depth, name ? [...seen, name] : seen, rows)
        }
    }

    const section = (caption, schema) =>
        ({caption, schema, rows: fieldRows(resolve(schema), '', 0, named(schema) ? [named(schema)] : [], [])})

    // one or more sections of a caption and the table of its fields
    function sections(schema) {
        const one = (schema.oneOf || []).find(s => s.type != 'array')
        const many = (schema.oneOf || []).find(s => s.type == 'array')
        if (one && many && named(one) && named(one) == named(many.items || {}))
            return [section(format('schemaOneOrMany', {name: named(one)}), one)]
        if (schema.type == 'array')
            return [section(captionOf(schema), schema.items || {})]
        const value = schema.additionalProperties
        if (value && typeof value == 'object')
            return [section('{<id>: ' + captionOf(value) + '}', value.type == 'array' ? value.items || {} : value)]
        const resolved = resolve(schema)
        const data = (resolved.properties || {}).data
        if (!data || data.type != 'array' || !data.items)
            return [section(named(schema) || (resolved.properties ? '' : typeLabel(schema)), schema)]
        // the envelope of collections and of the answer of a POST, then the fields of each item of data
        const required = resolved.required || []
        const fields = Object.keys(resolved.properties)
        return [
            {
                caption: '{' + fields.map(key => key == 'data' ? 'data: ' + captionOf(data) : key).join(', ') + '}',
                rows: fields.map(key => row(key, resolved.properties[key], required.includes(key))),
            },
            section(captionOf(data.items) + ' · ' + format('schemaItemOf', {field: 'data'}), data.items),
        ]
    }

    // the request schema of the resource the paths of a JSON Patch address: its PUT body, else its POST body
    function patchTarget(path) {
        const collection = path.replace(/\\/\\{[^}]+\\}$/, '')
        for (const [targetPath, method] of [[path, 'put'], [collection, 'put'], [collection, 'post']]) {
            const body = spec.getIn(['paths', targetPath, method, 'requestBody', 'content', 'application/json', 'schema'])
            if (!body)
                continue
            const schema = body.toJS()
            const name = named(schema.additionalProperties || (schema.oneOf || [schema])[0])
            if (name)
                return {name, path: targetPath, method}
        }
        return null
    }

    // opens the operation of the target with its request body on the Schema tab
    function showSchema(system, target) {
        const operation = spec.getIn(['paths', target.path, target.method])
        const tag = operation.getIn(['tags', 0])
        const id = operation.get('operationId')
        system.layoutActions.show(['operations-tag', tag], true)
        system.layoutActions.show(['operations', tag, id], true)
        system.layoutActions.show(['paths', target.path, target.method, 'requestBody', 'content', 'application/json', 'schema',
            'show-example-tab'], false)
        system.layoutActions.scrollTo(['operations', tag, id])
    }

    const inline = (h, line) => line.split(TICK).map((part, i) => i % 2 ? h('code', {key: i}, part) : part)

    function patchNote(h, system, path) {
        const target = patchTarget(path)
        if (!target)
            return null
        const [before, after] = text('schemaPatch').split('{name}')
        const link = h('button', {key: 'name', type: 'button', onClick: () => showSchema(system, target)}, target.name)
        return h('div', {className: 'ngcp-schema-note'}, ...inline(h, before), link, ...inline(h, after || ''))
    }

    function fieldCell(h, path) {
        const cut = path.lastIndexOf('.') + 1
        return h('td', {className: 'ngcp-schema-field'}, h('span', {className: 'ngcp-schema-path'}, path.slice(0, cut)), path.slice(cut))
    }

    function table(h, rows) {
        return h('table', {className: 'ngcp-schema-table'},
            h('thead', null, h('tr', null,
                h('th', null, text('schemaField')),
                h('th', null, text('schemaType')),
                h('th', {title: text('schemaRequired')}, text('schemaReq')),
                h('th', null, text('schemaDescription')),
            )),
            h('tbody', null, rows.map((r, i) => h('tr', {key: i},
                fieldCell(h, r.field),
                h('td', {className: 'ngcp-schema-type'}, r.type),
                h('td', {className: 'ngcp-schema-req'}, r.required ? '*' : ''),
                h('td', null, ...inline(h, r.details)),
            ))),
        )
    }

    function schemaTable(h, system, fullPath) {
        const [, path, method] = fullPath
        return h('div', {className: 'ngcp-schema'}, sections(spec.getIn(fullPath).toJS()).map((s, i) =>
            h('div', {key: i, className: 'ngcp-schema-section'},
                s.caption ? h('div', {className: 'ngcp-schema-caption'}, ...inline(h, s.caption)) : null,
                method == 'patch' && s.schema && named(s.schema) == 'PatchDto' ? patchNote(h, system, path) : null,
                s.rows.length ? table(h, s.rows) : null,
            )))
    }

    // the tabs of request bodies and responses: Schema (default), then Example Value (Edit Value in try-it-out);
    // replaces swagger ui's ModelExample, which puts the example first and always shows it in try-it-out
    function modelExample(system, props) {
        const h = system.React.createElement
        const {schema, example, isExecute, specPath, getComponent, getConfigs, layoutActions, layoutSelectors} = props
        const key = [...specPath.toJS(), 'show-example-tab']
        const showExample = !schema || layoutSelectors.isShown(key, false)
        const tab = (name, label, active) => h('li', {className: active ? 'tabitem active' : 'tabitem', role: 'presentation'},
            h('button', {className: 'tablinks', role: 'tab', 'aria-selected': active, 'data-name': name,
                onClick: () => layoutActions.show(key, name == 'example')}, label))
        const ModelWrapper = getComponent('ModelWrapper')
        const HighlightCode = getComponent('HighlightCode', true)
        return h('div', {className: 'model-example'},
            h('ul', {className: 'tab', role: 'tablist'},
                schema ? tab('model', 'Schema', !showExample) : null,
                tab('example', isExecute ? 'Edit Value' : 'Example Value', showExample),
            ),
            showExample
                ? h('div', {role: 'tabpanel', 'data-name': 'examplePanel'}, example || h(HighlightCode, null, '(no example available'))
                : h('div', {className: 'model-container', role: 'tabpanel', 'data-name': 'modelPanel'},
                    h(ModelWrapper, {...props, fullPath: specPath.toJS(), expandDepth: getConfigs().defaultModelExpandDepth})),
        )
    }

    window.ngcpSchemaTablePlugin = system => ({
        components: {
            modelExample: props => modelExample(system, props),
        },
        wrapComponents: {
            ModelWrapper: (Original, system) => props => {
                const h = system.React.createElement
                const fullPath = props.fullPath || []
                loadSpec(system)
                if (fullPath[0] != 'paths' || !spec.getIn(fullPath))
                    return h(Original, props)
                // a failed render would take the whole page down with it
                try {
                    return schemaTable(h, system, fullPath)
                } catch (err) {
                    console.error('schema table', err)
                    return h(Original, props)
                }
            },
        },
    })
})()
`

// the slate of the guide's code blocks in dark mode, swagger ui's text colours in light mode; the cells repeat
// swagger ui's selector of table cells, whose first column rule (max-width 20%, padding) would win otherwise
export const swaggerSchemaTableCss = `
.swagger-ui .ngcp-schema { padding: 4px 0; color: #3b4151 }
.swagger-ui .ngcp-schema-section + .ngcp-schema-section { margin-top: 18px }
.swagger-ui .ngcp-schema-caption { margin: 0 0 6px; font-size: 13px; font-weight: 600 }
.swagger-ui .ngcp-schema-note { margin: -2px 0 8px; font-size: 12px; color: #5b6573 }
.swagger-ui .ngcp-schema-note button { padding: 0; border: 0; background: none; color: #4990e2; font-size: inherit; cursor: pointer;
    text-decoration: underline }
.swagger-ui .ngcp-schema :is(.ngcp-schema-caption, .ngcp-schema-note, td) code { padding: 1px 4px; border-radius: 3px;
    background: rgba(59, 65, 81, .08); color: inherit; font-size: 11.5px }
.swagger-ui table.ngcp-schema-table { width: 100%; border-collapse: collapse; font-size: 12px }
.swagger-ui .ngcp-schema-table th { padding: 6px 8px; border-bottom: 1px solid rgba(59, 65, 81, .25); background: rgba(59, 65, 81, .06);
    text-align: left; font-size: 12px; font-weight: 600 }
.swagger-ui table.ngcp-schema-table tbody tr td { max-width: none; padding: 4px 8px; border-bottom: 1px solid rgba(59, 65, 81, .1);
    vertical-align: top; line-height: 1.45; overflow-wrap: anywhere }
.swagger-ui .ngcp-schema-table tbody tr:hover { background: rgba(73, 204, 144, .07) }
.swagger-ui .ngcp-schema-table :is(.ngcp-schema-field, .ngcp-schema-type) { white-space: nowrap; overflow-wrap: normal }
.swagger-ui .ngcp-schema-field { font-weight: 600 }
.swagger-ui .ngcp-schema-path { color: #8a94a3; font-weight: 400 }
.swagger-ui .ngcp-schema-type { color: #6f42c1 }
.swagger-ui .ngcp-schema-req { text-align: center; color: #c0392b; font-weight: 700 }
html.dark-mode .swagger-ui .ngcp-schema { color: #e3e6ea }
html.dark-mode .swagger-ui .ngcp-schema-note { color: #9aa3ad }
html.dark-mode .swagger-ui .ngcp-schema-note button { color: #79c0ff }
html.dark-mode .swagger-ui .ngcp-schema :is(.ngcp-schema-caption, .ngcp-schema-note, td) code { background: rgba(255, 255, 255, .1) }
html.dark-mode .swagger-ui .ngcp-schema-table th { border-bottom-color: #353b44; background: #1f2329 }
html.dark-mode .swagger-ui table.ngcp-schema-table tbody tr td { border-bottom-color: #2e343b }
html.dark-mode .swagger-ui .ngcp-schema-table tbody tr:hover { background: rgba(73, 204, 144, .08) }
html.dark-mode .swagger-ui .ngcp-schema-path { color: #8b949e }
html.dark-mode .swagger-ui .ngcp-schema-type { color: #d2a8ff }
html.dark-mode .swagger-ui .ngcp-schema-req { color: #ff7b72 }
`
