/**
 * Conversion of the invoice templates stored in the old format (Template Toolkit code hidden in svg comments,
 * `<!--{ [% ... %] }-->`) to the current format with `[% value %]` substitutions and layout markers (`<!--@zones-->`, ...).
 * The well known constructs of the default templates are converted, customised arguments of the macros are not preserved.
 */

const rules: [RegExp, string][] = [
    [/<!--\{\s*\[%\s*MACRO\s+draw_background\s+BLOCK\s*%\]\s*\}-->/g, '<!--@define-background-->'],
    [/<!--\{\s*\[%\s*draw_background\s*%\]\s*\}-->/g, '<!--@background-->'],
    [/<!--\{\s*\[%\s*zonelist\([^\n]*?zones\s*=\s*did\.data[^\n]*?\)\s*-?%\]\s*\}-->/g, '<!--@did-zones-->'],
    [/<!--\{\s*\[%\s*zonelist\([^\n]*?\)\s*-?%\]\s*\}-->/g, '<!--@zones-->'],
    [/<!--\{\s*\[%\s*calllist\([^\n]*?\)\s*-?%\]\s*\}-->/g, '<!--@calls-->'],
    [/<!--\{\s*\[%\s*aux\.lasty\s*=\s*aux\.lasty\s*\+\s*56\.7\s*%\]\s*\}-->/g, '<!--@advance-->'],
    [/<!--\{\s*\[%\s*check_pagebreak\([^\n]*?\)\s*-?%\]\s*\}-->/g, '<!--@pagebreak-->'],
    [/<!--\{\s*\[%\s*newpage\s*%\]\s*\}-->/g, '<!--@newpage-->'],
    [/<!--\{\s*\[%\s*FOREACH\s+did\s+IN\s+did_zones\s*%\]\s*\}-->/g, '<!--@foreach-did-->'],
    // the zonefee of a did is calculated by the renderer
    [/[ \t]*<!--\{\s*\[%\s*money_format\(amount=\(did\.totalcost\)[^\n]*?%\]\s*\}-->[ \t]*\n?/g, ''],
    [/<!--\{\s*\[%\s*END\s*%\]\s*\}-->/g, '<!--@end-->'],
    // hidden svg code, like the footer groups
    [/<!--\{([^\n]*?)\}-->/g, '$1'],
    // variables renamed or removed in v2
    [/\[%\s*did\.subscriber\.username\s*%\]:?[ \t]*/g, ''],
    [/(\[%\s*)contract\./g, '$1customer.'],
    [/(\[%\s*)contact\./g, '$1custcontact.'],
]

// header with the variable assignments
const header = /^\s*<!--\{\s*\[%[\s\S]*?%\]\s*\}-->[ \t]*\n?/

/**
 * Checks whether the template is stored in the old format
 */
export function isLegacyInvoiceTemplate(content: string): boolean {
    return content.includes('<!--{')
}

/**
 * Converts a template of the old format, returns other content as is
 */
export function convertLegacyInvoiceTemplate(content: string): string {
    if (!isLegacyInvoiceTemplate(content))
        return content
    let result = content.replace(header, '')
    for (const [pattern, replacement] of rules)
        result = result.replace(pattern, replacement)
    return result
}
