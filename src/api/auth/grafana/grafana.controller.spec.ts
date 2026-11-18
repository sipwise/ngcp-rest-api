import {ForbiddenException} from '@nestjs/common'
import {Request, Response} from 'express'
import {I18nService} from 'nestjs-i18n'

import {AuthGrafanaRequestDto} from './dto/grafana-request.dto'
import {AuthGrafanaController} from './grafana.controller'

describe('AuthGrafanaController', () => {
    let controller: AuthGrafanaController
    const i18n = {t: (key: string): string => key} as unknown as I18nService

    const mockRequest = (readOnly: boolean, headers: Record<string, string> = {}): Request => ({
        params: {},
        query: {},
        headers: headers,
        user: {username: 'testuser', readOnly: readOnly},
        header: (name: string): string => headers[name.toLowerCase()],
        url: '/api/auth/grafana',
        method: 'POST',
    } as unknown as Request)

    let headers: Record<string, string>
    const res = {
        setHeader: (name: string, value: string): void => {
            headers[name] = value
        },
    } as unknown as Response

    const dto = (grafana_edit?: boolean): AuthGrafanaRequestDto => Object.assign(new AuthGrafanaRequestDto(), {grafana_edit})

    beforeEach(() => {
        controller = new AuthGrafanaController(i18n)
        headers = {}
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    it('returns username when edit is not requested', () => {
        const result = controller.grafana(dto(), mockRequest(false), res)
        expect(result.grafana_user).toEqual('testuser')
    })

    it('returns admin when grafana_edit is true', () => {
        const result = controller.grafana(dto(true), mockRequest(false), res)
        expect(result.grafana_user).toEqual('admin')
    })

    it('sets NGCP-Grafana-User header to the grafana_user value', () => {
        let result = controller.grafana(dto(), mockRequest(false), res)
        expect(headers['NGCP-Grafana-User']).toEqual('testuser')
        expect(headers['NGCP-Grafana-User']).toEqual(result.grafana_user)
        result = controller.grafana(dto(true), mockRequest(false), res)
        expect(headers['NGCP-Grafana-User']).toEqual('admin')
        expect(headers['NGCP-Grafana-User']).toEqual(result.grafana_user)
    })

    it('does not set NGCP-Grafana-User header when denied', () => {
        expect(() => controller.grafana(dto(true), mockRequest(true), res)).toThrow(ForbiddenException)
        expect(headers['NGCP-Grafana-User']).toBeUndefined()
    })

    it('returns admin when NGCP-Grafana-Edit header is 1', () => {
        const result = controller.grafana(dto(), mockRequest(false, {'ngcp-grafana-edit': '1'}), res)
        expect(result.grafana_user).toEqual('admin')
    })

    it('returns username when NGCP-Grafana-Edit header is 0', () => {
        const result = controller.grafana(dto(), mockRequest(false, {'ngcp-grafana-edit': '0'}), res)
        expect(result.grafana_user).toEqual('testuser')
    })

    it('returns username when NGCP-Grafana-Edit header is not 0/1', () => {
        const result = controller.grafana(dto(), mockRequest(false, {'ngcp-grafana-edit': 'true'}), res)
        expect(result.grafana_user).toEqual('testuser')
    })

    it('grafana_edit in body takes precedence over the header', () => {
        let result = controller.grafana(dto(false), mockRequest(false, {'ngcp-grafana-edit': '1'}), res)
        expect(result.grafana_user).toEqual('testuser')
        result = controller.grafana(dto(true), mockRequest(false, {'ngcp-grafana-edit': '0'}), res)
        expect(result.grafana_user).toEqual('admin')
    })

    it('read-only user gets username when edit is not requested', () => {
        const result = controller.grafana(dto(), mockRequest(true), res)
        expect(result.grafana_user).toEqual('testuser')
    })

    it('read-only user is denied when grafana_edit is true', () => {
        expect(() => controller.grafana(dto(true), mockRequest(true), res)).toThrow(ForbiddenException)
    })

    it('read-only user is denied when NGCP-Grafana-Edit header is 1', () => {
        expect(() => controller.grafana(dto(), mockRequest(true, {'ngcp-grafana-edit': '1'}), res)).toThrow(ForbiddenException)
    })

    it('read-only user is allowed when body grafana_edit false overrides header', () => {
        const result = controller.grafana(dto(false), mockRequest(true, {'ngcp-grafana-edit': '1'}), res)
        expect(result.grafana_user).toEqual('testuser')
    })
})
