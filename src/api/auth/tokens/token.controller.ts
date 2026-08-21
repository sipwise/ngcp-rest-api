import {Body, Controller, Delete, Get, Param, Post, Req} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {AuthTokenCreateResponseDto} from './dto/token-create-response'
import {AuthTokenRequestDto} from './dto/token-request.dto'
import {AuthTokenResponseDto} from './dto/token-response.dto'
import {AuthTokenService} from './token.service'

import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseUUIDArrayPipe} from '~/pipes/parse-uuid-array.pipe'
import {ParseUUIDPipe} from '~/pipes/parse-uuid.pipe'

const resourceName = 'auth/tokens'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriber,
    RbacRole.subscriberadmin,
)
@ApiTags('AuthToken')
@Controller(resourceName)
export class AuthTokenController extends CrudController<AuthTokenRequestDto, AuthTokenResponseDto> {
    private readonly log = new LoggerService(AuthTokenController.name)

    constructor(
        private readonly authTokenService: AuthTokenService,
    ) {
        super(resourceName, authTokenService)
    }

    @Post()
    @ApiCreatedResponse(AuthTokenCreateResponseDto)
    async create(
        @Body() dto: AuthTokenRequestDto,
        @Req() req: Request,
    ): Promise<AuthTokenCreateResponseDto[]> {
        this.log.debug({
            message: 'create auth token',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const token = await this.authTokenService.create(dto.toInternal(), sr)
        return [new AuthTokenCreateResponseDto(token)]
    }

    @Get()
    @ApiPaginatedResponse(AuthTokenResponseDto)
    async readAll(@Req() req: Request): Promise<[AuthTokenResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all auth tokens',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [tokens, totalCount] = await this.authTokenService.readAll(sr)
        const responseList = tokens.map(token => new AuthTokenResponseDto(token))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: AuthTokenResponseDto,
    })
    async read(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Req() req: Request,
    ): Promise<AuthTokenResponseDto> {
        this.log.debug({
            message: 'fetch auth token by id',
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const token = await this.authTokenService.read(id, sr)
        return new AuthTokenResponseDto(token)
    }

    @Delete('{:id}')
    @ApiOkResponse({
        type: [String],
    })
    async delete(
        @ParamOrBody('id', new ParseUUIDArrayPipe()) ids: string[],
        @Req() req: Request,
    ): Promise<string[]> {
        this.log.debug({
            message: 'delete auth token by id',
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        return await this.authTokenService.delete(ids, sr)
    }
}
