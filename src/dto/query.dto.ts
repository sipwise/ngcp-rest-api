import {ReservedQueryParamsDto} from '~/config/constants.config'

/**
 * Common base of the *QueryDto classes bound via @Query(). Search filters (also `id`) come from the search DTOs
 * (`@ApiSearchQuery`), not from here: these classes are also bound on item routes.
 */
export class QueryDto extends ReservedQueryParamsDto {
}
