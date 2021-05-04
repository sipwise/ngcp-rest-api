import {Provider} from "@nestjs/common";
import {LOGGING_SERVICE} from "../../core/constants";
import {LoggingService} from "./logging.service";

export const loggingProviders: Provider<any>[] = [
    {
        provide: LOGGING_SERVICE,
        useClass: LoggingService,
    }
]
