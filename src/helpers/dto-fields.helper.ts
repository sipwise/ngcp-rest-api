const DTO_FIELDS = Symbol('dtoFields')

/**
 * Request DTO field names of internal entity fields (internal -> DTO), both sides checked by the compiler
 */
export type DtoFields<E, D> = {[K in keyof E]?: keyof D & string}

function snakeCase(name: string): string {
    return name.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

/**
 * Attaches the request field names to an internal entity built by a request DTO (`toInternal()`), for the
 * pointers of API errors. Only needed where the names differ by more than camelCase/snake_case.
 * The Symbol key is copied by spread and Object.assign, but invisible to Object.keys, JSON and TypeORM.
 * @param entity internal entity
 * @param fields static map of the request DTO
 */
export function withDtoFields<E extends object, D>(entity: E, fields: DtoFields<E, D>): E {
    entity[DTO_FIELDS] = fields
    return entity
}

/**
 * Request field name of an internal entity field: the attached map, else snake_case
 * @param entity internal entity (or a nested item of it)
 * @param field internal field name
 */
export function dtoFieldName(entity: unknown, field: string): string {
    const fields = entity != null && typeof entity == 'object' ? entity[DTO_FIELDS] as Record<string, string> : undefined
    return fields?.[field] ?? snakeCase(field)
}
