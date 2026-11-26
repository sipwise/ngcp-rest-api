import {Controller, Get, Param, Req, Res, StreamableFile} from '@nestjs/common'
import {ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PeeringRuleOverviewResponseDto} from './dto/rule-response.dto'
import {PeeringRuleOverviewSearchDto} from './dto/rule-search.dto'
import {PeeringRuleOverviewTextCsvExampleResponse} from './dto/rule-text-csv-example-response'
import {PeeringRuleOverviewService} from './rule.service'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiAcceptHeader} from '~/decorators/api-accept-header.decorator'
import {ApiPaginatedMultipleResponse} from '~/decorators/api-paginated-multiple-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {handleCsvExport} from '~/helpers/csv.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseRegexPipe} from '~/pipes/parse-regex-id.pipe'

const resourceName = 'peerings/overview/rules'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Peering')
@Controller(resourceName)
export class PeeringRuleOverviewController extends CrudController<never, PeeringRuleOverviewResponseDto> {
    private readonly log = new LoggerService(PeeringRuleOverviewController.name)

    constructor(
        private readonly ruleService: PeeringRuleOverviewService,
    ) {
        super(resourceName)
    }

    @Get()
    @ApiOperation({summary: 'List peering rules with the servers of their group'})
    @ApiSearchQuery(SearchLogic, PeeringRuleOverviewSearchDto)
    @ApiPaginatedMultipleResponse({
        description: 'Peering rules with the servers of their group, in JSON or CSV',
        contents: [
            {
                type: 'application/json',
                data: {
                    item: PeeringRuleOverviewResponseDto,
                },
            },
            {
                type: 'text/csv',
                data: {
                    example: PeeringRuleOverviewTextCsvExampleResponse,
                },
            },
        ],
    })
    @ApiAcceptHeader('application/json', 'application/hal+json', 'text/csv')
    @Transactional()
    async readAll(
        @Req() req: Request,
        @Res({passthrough: true}) res,
    ): Promise<[PeeringRuleOverviewResponseDto[], number] | StreamableFile> {
        this.log.debug({
            message: 'read peering rule overview',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        if (sr.headers['accept'] === 'text/csv')
            return handleCsvExport(await this.ruleService.exportCsv(sr), res)

        const [rules, totalCount] = await this.ruleService.readAll(sr)
        const responseList = await mapYield(rules, rule => new PeeringRuleOverviewResponseDto(rule, {url: req.url}))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOperation({summary: 'Get a peering rule with one server of its group'})
    @ApiOkResponse({
        type: PeeringRuleOverviewResponseDto,
    })
    async read(
        @Param('id', new ParseRegexPipe({pattern: /^\d+-\d+$/})) id: string,
        @Req() req: Request,
    ): Promise<PeeringRuleOverviewResponseDto> {
        this.log.debug({
            message: 'read peering rule overview by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new PeeringRuleOverviewResponseDto(
            await this.ruleService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }
}
