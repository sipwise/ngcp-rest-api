import {ADMIN_REPOSITORY} from "src/core/constants";
import {Admin} from "./admin.entity";

export const adminsProviders = [{
    provide: ADMIN_REPOSITORY,
    useValue: Admin,
}];