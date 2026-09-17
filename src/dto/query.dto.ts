import {IsOptional, IsString} from 'class-validator'

import {ReservedQueryParamsDto} from '~/config/constants.config'

/**
 * Common base for every *QueryDto bound via @Query() on a collection (readAll) endpoint.
 *
 * Extends ReservedQueryParamsDto (page, rows, order_by, ...) rather than RequestParamDto:
 * RequestParamDto was built for extracting a single :id from the URL PATH, and its id field is
 * a single @IsInt() - correct for a path param, but wrong here, since it would reject a
 * comma-separated collection filter like ?id=1,2,3 with a 422.
 *
 * 'id' below accepts the same comma-separated / '*'-wildcard syntax as every other filterable
 * field (see addSearchFilterToQueryBuilder in ~/helpers/query-builder.helper.ts), which is why
 * it's a plain optional string rather than a single number.
 */
export class QueryDto extends ReservedQueryParamsDto {
    @IsOptional()
    @IsString()
        id?: string
}
