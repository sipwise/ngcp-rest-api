import {ADMIN_REPOSITORY} from "core/constants";
import {Admin} from "./admin.entity";

export const adminsProviders = [{
    provide: ADMIN_REPOSITORY,
    useValue: Admin,
}];