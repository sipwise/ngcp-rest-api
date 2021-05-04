import {Module} from "@nestjs/common";
import {JournalingInterceptor} from "./journaling.interceptor";
import {JournalModule} from "../../modules/journal/journal.module";

@Module({
    imports: [JournalModule],
    providers: [JournalingInterceptor],
    exports: [JournalModule]
})
export class InterceptorModule {}
