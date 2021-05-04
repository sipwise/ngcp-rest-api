import {Module} from "@nestjs/common";
import {AdminsController} from "./admins.controller";
import {adminsProviders} from "./admins.providers";
import {AdminsService} from "./admins.service";
import {InterceptorModule} from "../../core/interceptors/interceptor.module";

@Module({
    imports: [
        // LoggingService,
        InterceptorModule],
    controllers: [AdminsController],
    exports: [AdminsService],
    providers: [
        // LoggingService,
        AdminsService,
        ...adminsProviders],
})
export class AdminsModule {}
