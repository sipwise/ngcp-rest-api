import {applyDecorators, UseGuards, UseInterceptors} from "@nestjs/common";
import {OmniGuard} from "../guards/omni.guard";
import {RolesGuard} from "../guards/roles.guard";
import {ApiBasicAuth, ApiBearerAuth, ApiSecurity} from "@nestjs/swagger";
import {LoggingInterceptor} from "../interceptors/logging.interceptor";
import {JournalingInterceptor} from "../interceptors/journaling.interceptor";
import {Roles} from "./roles.decorator";
import {ReadOnlyGuard} from "../guards/read-only.guard";

export function Auth(...roles: string[]) {
    //console.log(`Roles in ${Auth.name}`, roles)
    return applyDecorators(
        Roles(...roles),
        // OmniGuard binds user auth object to request, Guards requiring user object must always come after
        UseGuards(OmniGuard, RolesGuard, ReadOnlyGuard),
        UseInterceptors(LoggingInterceptor, JournalingInterceptor),
        ApiBasicAuth(),
        ApiBearerAuth(),
        ApiSecurity('cert')
    )
}
