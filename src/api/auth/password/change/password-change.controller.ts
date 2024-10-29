import {Body, Controller, Post, Req} from '@nestjs/common'
import {ApiBody, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {PasswordChangeRequestDto} from './dto/password-change-request.dto'
import {PasswordChangeResponseDto} from './dto/password-change-response.dto'
import {PasswordChangeService} from './password-change.service'

import {JournalService} from '~/api/journals/journal.service'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {AuthOptions} from '~/decorators/auth-options.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'auth/password/change'

@ApiTags('Auth')
@Controller(resourceName)
@AuthOptions({skipMaxAge: true})
@Auth()
export class PasswordChangeController extends CrudController<PasswordChangeRequestDto, PasswordChangeResponseDto> {
    private readonly log = new LoggerService(PasswordChangeController.name)

    constructor(
        private readonly authService: PasswordChangeService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, authService, journalService)
    }

    @Post()
    @ApiCreatedResponse(PasswordChangeResponseDto)
    @ApiBody({
        type: PasswordChangeRequestDto,
        isArray: false,
    })
    async createPasswordChange(
        @Body() createDto: PasswordChangeRequestDto,
        @Req() req: Request,
    ): Promise<PasswordChangeResponseDto> {
        this.log.debug({
            message: 'change password',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        let realm = 'admin'
        if ('x-auth-realm' in req.headers)
            realm = sr.headers['x-auth-realm']
        await this.authService.changePassword(sr, sr.user.id, createDto.new_password, realm)
        const response = new PasswordChangeResponseDto()
        await this.journalService.writeJournal(sr, sr.user.id, response)
        return response
    }
}