import {Module} from '@nestjs/common';
import {journalProviders} from "./journal.provider";
import {JournalController} from "./journal.controller";

@Module({
    controllers: [JournalController],
    imports: [
        //LoggingModule
    ],
    providers: [...journalProviders],
    exports: [...journalProviders],
})
export class JournalModule {
}
