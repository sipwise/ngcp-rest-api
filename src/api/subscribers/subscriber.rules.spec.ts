import {
    changedFields,
    derivePrimary,
    duplicateAlias,
    extInRange,
    limitReached,
    lockLevel,
    poolDiff,
    readOnlyFields,
    renumber,
    sameValue,
} from './subscriber.rules'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

const subscriber = (values: Partial<internal.Subscriber> = {}): internal.Subscriber => Object.assign(new internal.Subscriber(), {
    id: 2,
    status: VoipSubscriberStatus.Active,
    lock: null,
    administrative: false,
    profileSetId: null,
    profileId: null,
    primaryNumber: {numberId: 1, cc: 43, ac: '1', sn: '100'},
    aliasNumbers: [{numberId: 2, cc: 43, ac: '1', sn: '101', isDevId: true}],
    pbxExtension: null,
    pbxGroupIds: [5, 6],
    pbxGroupmemberIds: [7, 8],
    isPbxPilot: false,
    ...values,
})

describe('subscriber.rules', () => {
    describe('readOnlyFields', () => {
        it.each([
            ['admin on any subscriber', RbacRole.admin, 1, subscriber(), []],
            ['subscriberadmin on another subscriber', RbacRole.subscriberadmin, 1, subscriber(),
                ['administrative', 'profileSetId', 'profileId', 'externalId']],
            ['subscriberadmin on the pilot', RbacRole.subscriberadmin, 1, subscriber({isPbxPilot: true}),
                ['administrative', 'profileSetId', 'profileId', 'externalId', 'lock', 'status', 'primaryNumber', 'aliasNumbers']],
            ['subscriberadmin on itself', RbacRole.subscriberadmin, 2, subscriber(),
                ['administrative', 'profileSetId', 'profileId', 'externalId', 'lock', 'status', 'primaryNumber', 'aliasNumbers']],
            ['subscriber on itself', RbacRole.subscriber, 2, subscriber(),
                ['administrative', 'profileSetId', 'profileId', 'externalId', 'lock', 'status', 'primaryNumber', 'aliasNumbers',
                    'pbxExtension', 'pbxGroupIds', 'pbxGroupmemberIds', 'pbxHuntPolicy', 'pbxHuntTimeout', 'pbxHuntCancelMode']],
        ])('%s', (_case, role, callerId, target, expected) => {
            expect(readOnlyFields(role, callerId, target)).toEqual(expected)
        })
    })

    describe('sameValue / changedFields', () => {
        it.each<[string, keyof internal.Subscriber, Partial<internal.Subscriber>, boolean]>([
            ['primary number ignoring number_id', 'primaryNumber', {primaryNumber: {cc: 43, ac: '1', sn: '100'}}, true],
            ['other primary number', 'primaryNumber', {primaryNumber: {cc: 43, ac: '1', sn: '200'}}, false],
            ['aliases without is_devid', 'aliasNumbers', {aliasNumbers: [{cc: 43, ac: '1', sn: '101', isDevId: undefined}]}, true],
            ['aliases with another is_devid', 'aliasNumbers', {aliasNumbers: [{cc: 43, ac: '1', sn: '101', isDevId: false}]}, false],
            ['lock 0 and null', 'lock', {lock: '0'}, true],
            ['profile 0 and null', 'profileId', {profileId: 0}, true],
            ['group ids as a set', 'pbxGroupIds', {pbxGroupIds: [6, 5]}, true],
            ['member ids in order', 'pbxGroupmemberIds', {pbxGroupmemberIds: [8, 7]}, false],
            ['empty and null extension', 'pbxExtension', {pbxExtension: ''}, true],
        ])('%s', (_case, field, values, same) => {
            expect(sameValue(field, subscriber(), subscriber(values))).toBe(same)
        })

        it('lists changed fields only, omitted ones are no change', () => {
            const requested = subscriber({status: VoipSubscriberStatus.Locked, lock: undefined, administrative: undefined})
            expect(changedFields(subscriber(), requested, ['status', 'lock', 'administrative', 'primaryNumber'])).toEqual(['status'])
        })
    })

    describe('numbers', () => {
        const pilot = {cc: 43, ac: '1', sn: '100'}

        it('derives a seat number from the pilot and the extension', () => {
            expect(derivePrimary(pilot, '22')).toEqual({cc: 43, ac: '1', sn: '10022'})
        })

        it.each([
            ['a seat of the pilot', {cc: 43, ac: '1', sn: '10022'}, {cc: 49, ac: '2', sn: '50022'}],
            ['another area code', {cc: 43, ac: '2', sn: '10022'}, undefined],
            ['a number not starting with the pilot number', {cc: 43, ac: '1', sn: '20022'}, undefined],
        ])('renumbers %s', (_case, number, expected) => {
            expect(renumber(pilot, {cc: 49, ac: '2', sn: '500'}, number)).toEqual(expected)
        })

        it('takes the pilot sn literally as prefix', () => {
            expect(renumber({cc: 43, ac: '1', sn: '1.0'}, {cc: 43, ac: '1', sn: '7'}, {cc: 43, ac: '1', sn: '1200'})).toBeUndefined()
        })

        it('splits requested numbers into kept, assigned from the pool, not available and revoked', () => {
            const n = (sn: string): {cc: number, ac: string, sn: string} => ({cc: 43, ac: '1', sn})
            expect(poolDiff([n('1'), n('2')], [n('2'), n('3'), n('4')], [n('3')])).toEqual({
                notInPool: [2],
                assigned: [n('3')],
                revoked: [n('1')],
            })
        })

        it('finds an alias repeating the primary or another alias', () => {
            expect(duplicateAlias(pilot, [{cc: 43, ac: '1', sn: '101'}, pilot])).toBe(1)
            expect(duplicateAlias(null, [{cc: 43, ac: '1', sn: '101'}, {cc: 43, ac: '1', sn: '101'}])).toBe(1)
            expect(duplicateAlias(pilot, [{cc: 43, ac: '1', sn: '101'}])).toBe(-1)
        })
    })

    describe('limits, ranges, lock', () => {
        it.each([
            ['no range', '5', null, null, true],
            ['in range', '150', 100, 299, true],
            ['below', '99', 100, null, false],
            ['above', '300', null, 299, false],
            ['non-numeric with a range', 'abc', 100, 299, false],
            ['zero bounds', '5', 0, 0, true],
        ])('extension range: %s', (_case, extension, min, max, expected) => {
            expect(extInRange(extension, min, max)).toBe(expected)
        })

        it.each([
            [null, 10, 1, false],
            [-1, 10, 1, false],
            [10, 9, 1, false],
            [10, 10, 1, true],
            [10, 8, 3, true],
        ])('limit %s with %s current and %s added', (max, current, adding, expected) => {
            expect(limitReached(max, current, adding)).toBe(expected)
        })

        it.each([
            ['given lock wins', 'locked', '2', undefined, '2'],
            ['locking sets 4', 'locked', undefined, subscriber(), '4'],
            ['staying locked keeps the level', 'locked', undefined, subscriber({status: VoipSubscriberStatus.Locked, lock: '3'}), '3'],
            ['unlocking keeps the level', 'active', undefined, subscriber({status: VoipSubscriberStatus.Locked, lock: '3'}), '3'],
            ['active without a lock', 'active', undefined, subscriber({lock: '1'}), null],
        ])('lock level: %s', (_case, status, lock, stored, expected) => {
            expect(lockLevel(status, lock, stored)).toBe(expected)
        })
    })
})
