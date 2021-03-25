import {Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards} from "@nestjs/common";
import {ApiCreatedResponse, ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {CertGuard} from "core/guards/cert.guard";
import {AdminsService} from "./admins.service";
import {CreateAdminDto} from "./dto/create-admin.dto";
import {UpdateAdminDto} from "./dto/update-admin.dto";
import {Admin} from "./admin.entity";

@ApiTags('admins')
@Controller('admins')
@UseGuards(CertGuard)
export class AdminsController {
    constructor(private readonly adminsService: AdminsService) {}

    @Post()
    @ApiCreatedResponse({
        type: Admin,
    })
    async create(@Body() admin: CreateAdminDto) {
        return await this.adminsService.create(admin);
    }

    @Get()
    @ApiOkResponse()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${process.env.API_DEFAULT_QUERY_PAGE}`;
        row = row ? row : `${process.env.API_DEFAULT_QUERY_ROWS}`;
        return await this.adminsService.findAll(page, row);
    }

    @Get(':id')
    @ApiOkResponse()
    async findOne(@Param('id') id: string) {
        return await this.adminsService.findOne(+id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() admin: UpdateAdminDto) {
        return await this.adminsService.update(+id, admin);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.adminsService.remove(+id);
    }
}