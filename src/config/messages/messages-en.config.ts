import {Message} from '../../interfaces/message.interface'
import {getErrorCodeByTitle} from '../error-codes.config'

export const MessagesEN: { [id: string]: Message } = {}
MessagesEN.PERMISSION_DENIED = {
    description: 'Permission denied',
    errorCode: getErrorCodeByTitle('PERMISSION_DENIED'),
}
MessagesEN.DELETE_OWN_USER = {
    description: 'Cannot delete own user',
    errorCode: getErrorCodeByTitle('DELETE_OWN_USER'),
}
MessagesEN.INVALID_USER_ROLE = {
    description: 'Invalid user role',
    errorCode: getErrorCodeByTitle('INVALID_USER_ROLE'),
}
MessagesEN.CHANGE_OWN_PROPERTY = {
    description: 'Cannot change own property',
    errorCode: getErrorCodeByTitle('CHANGE_OWN_PROPERTY'),
}
MessagesEN.DUPLICATE_ENTRY = {
    description: 'Duplicate entry',
    errorCode: getErrorCodeByTitle('DUPLICATE_ENTRY'),
}
MessagesEN.DELETE_CUSTOMERCONTACT = {
    description: 'Cannot delete customercontact',
    errorCode: getErrorCodeByTitle('DELETE_CUSTOMERCONTACT'),
}
MessagesEN.RESELLER_ID_SYSTEMCONTACTS = {
    description: 'reseller_id not allowed on systemcontacts',
    errorCode: getErrorCodeByTitle('RESELLER_ID_SYSTEMCONTACTS'),
}
MessagesEN.INVALID_RESELLER_ID = {
    description: 'Invalid reseller_id',
    errorCode: getErrorCodeByTitle('INVALID_RESELLER_ID'),
}
MessagesEN.CONTRACT_EXISTS = {
    description: 'invalid \'contract_id\', reseller with this contract already exists',
    errorCode: getErrorCodeByTitle('CONTRACT_EXISTS'),
}
MessagesEN.NAME_EXISTS = {
    description: 'invalid \'name\', reseller with this name already exists',
    errorCode: getErrorCodeByTitle('NAME_EXISTS'),
}
MessagesEN.CONTRACT_NOT_FOUND = {
    description: 'Invalid \'contract_id\'',
    errorCode: getErrorCodeByTitle('CONTRACT_NOT_FOUND'),
}
MessagesEN.CONTRACT_INVALID_LINK = {
    description: 'Invalid \'contract_id\', linking to a customer contact',
    errorCode: getErrorCodeByTitle('CONTRACT_INVALID_LINK'),
}
MessagesEN.CHANGE_ID_FORBIDDEN = {
    description: 'Changing the reseller ID is not allowed',
    errorCode: getErrorCodeByTitle('CHANGE_ID_FORBIDDEN'),
}
MessagesEN.RESELLER_SET_ID_FORBIDDEN = {
    description: 'Cannot set the reseller Id if it was unset before',
    errorCode: getErrorCodeByTitle('RESELLER_SET_ID_FORBIDDEN'),
}
MessagesEN.CHANGE_UNASSOCIATED_FORBIDDEN = {
    description: 'Updating items not associated with a reseller is not allowed',
    errorCode: getErrorCodeByTitle('CHANGE_UNASSOCIATED_FORBIDDEN'),
}
MessagesEN.RESELLER_INVALID_ID = {
    description: 'Reseller ID other than the user\'s reseller ID is not allowed',
    errorCode: getErrorCodeByTitle('RESELLER_INVALID_ID'),
}
MessagesEN.RESELLER_UNDEFINED_ID = {
    description: 'Undefined reseller ID is not allowed',
    errorCode: getErrorCodeByTitle('RESELLER_UNDEFINED_ID'),
}
MessagesEN.RESELLER_CREATE_INVALID_ASSOCIATION = {
    description: 'Creating items associated with a reseller is allowed for admin and reseller users only',
    errorCode: getErrorCodeByTitle('RESELLER_CREATE_INVALID_ASSOCIATION'),
}
MessagesEN.RESELLER_UPDATE_INVALID_ASSOCIATION = {
    description: 'Updating items associated with a reseller is allowed for admin and reseller users only',
    errorCode: getErrorCodeByTitle('RESELLER_UPDATE_INVALID_ASSOCIATION'),
}
MessagesEN.FILES_LIMIT_REACHED = {
    description: 'Files limit reached',
    errorCode: getErrorCodeByTitle('FILES_LIMIT_REACHED'),
}
MessagesEN.QUOTA_EXCEEDED = {
    description: 'Quota exceeded',
    errorCode: getErrorCodeByTitle('QUOTA_EXCEEDED'),
}
MessagesEN.DOMAIN_DOES_NOT_BELONG_TO_RESELLER = {
    description: 'domain does not belong to reseller',
    errorCode: getErrorCodeByTitle('DOMAIN_DOES_NOT_BELONG_TO_RESELLER'),
}
MessagesEN.CONTACT_STILL_IN_USE = {
    description: 'Contact is still in use',
    errorCode: getErrorCodeByTitle('CONTACT_STILL_IN_USE'),
}
MessagesEN.DELETE_SYSTEMCONTACT = {
    description: 'Cannot delete systemcontact',
    errorCode: getErrorCodeByTitle('DELETE_SYSTEMCONTACT'),
}
MessagesEN.INVALID_TYPE = {
    description: 'invalid "type"',
    errorCode: getErrorCodeByTitle('INVALID_TYPE'),
}
MessagesEN.INVALID_CONTACT_ID = {
    description: 'invalid contact_id',
    errorCode: getErrorCodeByTitle('INVALID_CONTACT_ID'),
}
MessagesEN.INVALID_SYSTEM_CONTACT = {
    description: 'The contact_id is not a valid ngcp:systemcontacts item, but an ngcp:customercontacts item',
    errorCode: getErrorCodeByTitle('INVALID_SYSTEM_CONTACT'),
}
MessagesEN.DELETE_SPECIAL_USER = {
    description: 'Cannot delete special user',
    errorCode: getErrorCodeByTitle('DELETE_SPECIAL_USER'),
}
MessagesEN.EXPAND_OBJECT_FAILED = {
    description: (str: string) => `Expanding ${str} not allowed or impossible`,
    errorCode: getErrorCodeByTitle('EXPAND_OBJECT_FAILED'),
}
