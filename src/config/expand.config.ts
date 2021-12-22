import {RBAC_ROLES} from './constants.config'

export const expandLogic = {
    "reseller_id": {
        controller: "resellersController",
        roles: [RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.reseller]
    },
    "contact_id": {
        controller: "customercontactsController",
        roles: [RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin, RBAC_ROLES.reseller]
    },
    "contract_id": {
        controller: "contractsController",
        roles: [RBAC_ROLES.admin, RBAC_ROLES.system]
    }
}
