import { Module } from "@nestjs/common";
import { AdminsController } from "./admins.controller";
import { adminsProviders } from "./admins.providers";
import { AdminsService } from "./admins.service";

@Module({
    controllers: [AdminsController],
    exports: [AdminsService],
    providers: [AdminsService, ...adminsProviders],
})
export class AdminsModule {}