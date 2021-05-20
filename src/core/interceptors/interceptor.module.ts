import {Module} from "@nestjs/common";
import {JournalingInterceptor} from "./journaling.interceptor";
import {JournalModule} from "../../modules/journal/journal.module";
import {LoggingModule} from "../../modules/logging/logging.module";
import {LoggingService} from "../../modules/logging/logging.service";
import {LoggingInterceptor} from "./logging.interceptor";

@Module({
    imports: [JournalModule, LoggingModule],
    providers: [JournalingInterceptor, LoggingInterceptor, LoggingService],
    exports: [JournalModule, LoggingModule],
})
export class InterceptorModule {}
