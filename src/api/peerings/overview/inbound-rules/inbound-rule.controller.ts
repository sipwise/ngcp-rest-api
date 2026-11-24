import {Controller, Get, Param, Req, Res, StreamableFile} from '@nestjs/common'
import {ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PeeringInboundRuleOverviewResponseDto} from './dto/inbound-rule-response.dto'
import {PeeringInboundRuleOverviewSearchDto} from './dto/inbound-rule-search.dto'
import {PeeringInboundRuleOverviewTextCsvExampleResponse} from './dto/inbound-rule-text-csv-example-response'
import {PeeringInboundRuleOverviewService} from './inbound-rule.service'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiAcceptHeader} from '~/decorators/api-accept-header.decorator'
import {ApiPaginatedMultipleResponse} from '~/decorators/api-paginated-multiple-response.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {handleCsvExport} from '~/helpers/csv.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseRegexPipe} from '~/pipes/parse-regex-id.pipe'

const resourceName = 'peerings/overview/inbound-rules'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Peering')
@Controller(resourceName)
export class PeeringInboundRuleOverviewController extends CrudController<never, PeeringInboundRuleOverviewResponseDto> {
    private readonly log = new LoggerService(PeeringInboundRuleOverviewController.name)

    constructor(
        private readonly ruleService: PeeringInboundRuleOverviewService,
    ) {
        super(resourceName)
    }

    @Get()
    @ApiOperation({summary: 'List peering inbound rules with the servers of their group'})
    @ApiSearchQuery(SearchLogic, PeeringInboundRuleOverviewSearchDto)
    @ApiPaginatedMultipleResponse({
        description: 'Peering inbound rules with the servers of their group, in JSON or CSV',
        contents: [
            {
                type: 'application/json',
                data: {
                    item: PeeringInboundRuleOverviewResponseDto,
                },
            },
            {
                type: 'text/csv',
                data: {
                    example: PeeringInboundRuleOverviewTextCsvExampleResponse,
                },
            },
        ],
    })
    @ApiAcceptHeader('application/json', 'application/hal+json', 'text/csv')
    async readAll(
        @Req() req: Request,
        @Res({passthrough: true}) res,
    ): Promise<[PeeringInboundRuleOverviewResponseDto[], number] | StreamableFile> {
        this.log.debug({
            message: 'read peering inbound rule overview',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        if (sr.headers['accept'] === 'text/csv')
            return handleCsvExport(await this.ruleService.exportCsv(sr), res)

        const [rules, totalCount] = await this.ruleService.readAll(sr)
        const responseList = await mapYield(rules, rule => new PeeringInboundRuleOverviewResponseDto(rule, {url: req.url}))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOperation({summary: 'Get a peering inbound rule with one server of its group'})
    @ApiOkResponse({
        type: PeeringInboundRuleOverviewResponseDto,
    })
    async read(
        @Param('id', new ParseRegexPipe({pattern: /^\d+-\d+$/})) id: string,
        @Req() req: Request,
    ): Promise<PeeringInboundRuleOverviewResponseDto> {
        this.log.debug({
            message: 'read peering inbound rule overview by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new PeeringInboundRuleOverviewResponseDto(
            await this.ruleService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }
}
