import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response} from "express";
import { Roles } from "src/core/decorators/roles.decorator";
import { BasicAuthGuard } from "src/core/guards/basic.auth.guard";
import { CertGuard } from "src/core/guards/cert.guard";
import { RolesGuard } from "src/core/guards/roles.guard";
import { TransformInterceptor } from "src/core/interceptors/transform.interceptor";
import { AdminsService } from "./admins.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { Admin } from "./admin.entity";

@ApiTags('admins')
@Controller('admins')
export class AdminsController {
    constructor(private readonly adminsService: AdminsService) {}

    @Post()
    //@UseGuards(BasicAuthGuard)
    @ApiCreatedResponse({
        type: Admin,
    })
    async create(@Body() admin: CreateAdminDto) {
        // console.log(admin)
        return await this.adminsService.create(admin);
    }

    @Get()
    // @UseGuards(BasicAuthGuard)
    // @Roles('admin')
    //@UseGuards(RolesGuard)
    // @UseGuards(CertGuard)
    @ApiOkResponse()
    @UseInterceptors(new TransformInterceptor({resource: "admins", pageName: "page", perPageName: "row"}))
    async findAll() {
        return await this.adminsService.findAll();
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