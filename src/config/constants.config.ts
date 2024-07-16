import {AppService} from '../app.service'

export const DATABASES = {
    accounting: {
        token: 'db_accounting',
        name: 'accounting',
    },
    billing: {
        token: 'db_billing',
        name: 'billing',
    },
}

export const LOGGER_SERVICE = 'LOGGER_SERVICE'

export const jwtConstants = {
    secret: AppService.config.common.jwt_key,
}

export enum RbacRole {
    system = 'system',
    admin = 'admin',
    reseller = 'reseller',
    ccare = 'ccare',
    ccareadmin = 'ccareadmin',
    lintercept = 'lintercept',
    subscriber = 'subscriber',
    subscriberadmin = 'subscriberadmin',
}

export interface RbacFlag {
    is_system: boolean
    is_superuser: boolean
    is_ccare: boolean
    lawful_intercept: boolean
}

export const reservedQueryParams = [
    'page', // page number
    'rows', // row number
    'order_by', // order_by field
    'order_by_direction', // order asc/desc
    'search_or', // search multiple fields as "or" instead of "and" true/false
    'expand', // expand logic
    'soft_expand', // expand logic
    'allow_unknown_params', // when provided, unknown params are ignored
    'x_rbw_req_id', // reserved for ALE as their unique request identifier to appear in the logs
    'x_rbw_correl_id', // reserved for ALE as their unique request identifier to appear in the logs
]

export enum License {
    aof = 'aof',
    batchProvisioning = 'batch_provisioning',
    billing = 'billing',
    callRecording = 'call_recording',
    csc = 'csc',
    cscCalls = 'csc_calls',
    csta = 'csta',
    ct = 'ct',
    deviceProvisioning = 'device_provisioning',
    enforce = 'enforce',
    externalLnp = 'external_lnp',
    fax = 'fax',
    gpuTranscoding = 'gpu-transcoding',
    headerManipulation = 'header_manipulation',
    invoice = 'invoice',
    lcr = 'lcr',
    lnpImporter = 'lnp_importer',
    pbx = 'pbx',
    phonebook = 'phonebook',
    prepaidInewrate = 'prepaid-inewrate',
    prepaidSwrate = 'prepaid-swrate',
    pushd = 'pushd',
    reseller = 'reseller',
    sms = 'sms',
    tpcc = 'tpcc',
    transcoding = 'transcoding',
    voisniffHomer = 'voisniff-homer',
    voisniffMysqlDump = 'voisniff-mysql_dump',
    voisniffX2x3 = 'voisniff-x2x3',
    xmpp = 'xmpp',
}

export const procDirLocation = process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'test'
    ? './etc/proc'
    : '/proc'

export const procLicensesLocation = procDirLocation + '/ngcp/flags'