import {Message} from '../interfaces/message.interface'
import {MessageCodes} from './message-codes.config'
import {ServiceRequest} from '../interfaces/service-request.interface'
import {MessageDescriptionsEN} from './messagedescriptions/message-descriptions-en.config'

export class Messages {
    static MessageDescriptions: { [id: string]: any } = {
        EN: MessageDescriptionsEN,
    }

    static PERMISSION_DENIED = 'PERMISSION_DENIED'
    static DELETE_OWN_USER = 'DELETE_OWN_USER'
    static INVALID_USER_ROLE = 'INVALID_USER_ROLE'
    static CHANGE_OWN_PROPERTY = 'CHANGE_OWN_PROPERTY'
    static DUPLICATE_ENTRY = 'DUPLICATE_ENTRY'
    static DELETE_CUSTOMERCONTACT = 'DELETE_CUSTOMERCONTACT'
    static RESELLER_ID_SYSTEMCONTACTS = 'RESELLER_ID_SYSTEMCONTACTS'
    static INVALID_RESELLER_ID = 'INVALID_RESELLER_ID'
    static CONTRACT_EXISTS = 'CONTRACT_EXISTS'
    static NAME_EXISTS = 'NAME_EXISTS'
    static CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND'
    static CONTRACT_INVALID_LINK = 'CONTRACT_INVALID_LINK'
    static CHANGE_ID_FORBIDDEN = 'CHANGE_ID_FORBIDDEN'
    static RESELLER_SET_ID_FORBIDDEN = 'RESELLER_SET_ID_FORBIDDEN'
    static CHANGE_UNASSOCIATED_FORBIDDEN = 'CHANGE_UNASSOCIATED_FORBIDDEN'
    static RESELLER_INVALID_ID = 'RESELLER_INVALID_ID'
    static RESELLER_UNDEFINED_ID = 'RESELLER_UNDEFINED_ID'
    static RESELLER_CREATE_INVALID_ASSOCIATION = 'RESELLER_CREATE_INVALID_ASSOCIATION'
    static RESELLER_UPDATE_INVALID_ASSOCIATION = 'RESELLER_UPDATE_INVALID_ASSOCIATION'
    static FILES_LIMIT_REACHED = 'FILES_LIMIT_REACHED'
    static QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
    static DOMAIN_DOES_NOT_BELONG_TO_RESELLER = 'DOMAIN_DOES_NOT_BELONG_TO_RESELLER'
    static CONTACT_STILL_IN_USE = 'CONTACT_STILL_IN_USE'
    static DELETE_SYSTEMCONTACT = 'DELETE_SYSTEMCONTACT'
    static INVALID_TYPE = 'INVALID_TYPE'
    static INVALID_CONTACT_ID = 'INVALID_CONTACT_ID'
    static INVALID_SYSTEM_CONTACT = 'INVALID_SYSTEM_CONTACT'
    static DELETE_SPECIAL_USER = 'DELETE_SPECIAL_USER'
    static EXPAND_OBJECT_IMPOSSIBLE = 'EXPAND_OBJECT_IMPOSSIBLE'
    static EXPAND_OBJECT_FAILED = 'EXPAND_OBJECT_FAILED'
    static DOMAIN_ALREADY_EXISTS = 'DOMAIN_ALREADY_EXISTS'
    static UNKNOWN_ROLE = 'UNKNOWN_ROLE'
    static VALIDATION_FAILED_UNSUPPORTED_ID = 'VALIDATION_FAILED_UNSUPPORTED_ID'
    static REQUEST_PROCESSING_ERROR = 'REQUEST_PROCESSING_ERROR'

    /**
     * Builds a Message object.
     * If the user has requested a specific language, that is supported by the system,
     * the message is displayed in that specific language. If the language does not exist
     * or is not supported, the message is displayed in English
     * @param messageTitle - title of the message that will be returned to the user
     * @param req - user request
     * @param arg - optional argument in case of string interpolation with a specific message
     */
    static invoke(messageTitle: string, req?: ServiceRequest, arg?: string): Message {
        const lang = (req?.query?.lang && req.query.lang in Messages.MessageDescriptions) ? req.query.lang : 'EN'
        const msg: Message = {description: '', errorCode: 0}
        msg.description = (typeof Messages.MessageDescriptions[`${lang}`]?.[messageTitle] === 'string') ?
            Messages.MessageDescriptions[`${lang}`]?.[messageTitle] : Messages.MessageDescriptions[`${lang}`]?.[messageTitle](arg)
        msg.errorCode = MessageCodes[messageTitle]
        return msg
    }
}
