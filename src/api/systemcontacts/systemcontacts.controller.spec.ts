import {Test} from '@nestjs/testing'
import {SystemcontactsController} from './systemcontacts.controller'
import {SystemcontactsService} from './systemcontacts.service'
import {JournalsModule} from '../journals/journals.module'
import {AppModule} from '../../app.module'
import {HttpStatus, INestApplication, NotFoundException} from '@nestjs/common'
import {SystemcontactsModule} from './systemcontacts.module'

import request from 'supertest'
import {CrudService} from '../../interfaces/crud-service.interface'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Operation} from '../../helpers/patch.helper'
import {ContactStatus} from '../../entities/db/billing/contact.mariadb.entity'

class MockSystemcontactsService implements CrudService<SystemcontactCreateDto, SystemcontactResponseDto> {
    adjust(id: number, patch: Operation[], req?: ServiceRequest): Promise<SystemcontactResponseDto> {
        return Promise.resolve(undefined)
    }

    create(dto: SystemcontactCreateDto, req?: ServiceRequest): Promise<SystemcontactResponseDto> {
        return Promise.resolve(undefined)
    }

    delete(id: number): Promise<number> {
        return Promise.resolve(0)
    }

    read(id: number): Promise<SystemcontactResponseDto> {
        if (id == 0) {
            throw new NotFoundException()
        }
        const res: SystemcontactResponseDto = {
            id: 0, newsletter: false, status: ContactStatus.Terminated,
        }
        return Promise.resolve(res)
    }

    readAll(page: number, rows: number): Promise<SystemcontactResponseDto[]> {
        return Promise.resolve([])
    }

    toResponse(entity: any): SystemcontactResponseDto {
        return undefined
    }

    update(id: number, dto: SystemcontactCreateDto, req?: ServiceRequest): Promise<SystemcontactResponseDto> {
        return Promise.resolve(undefined)
    }

}

describe('SystemcontactsController', () => {
    let app: INestApplication
    const sysContactService = new MockSystemcontactsService()

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SystemcontactsModule, JournalsModule, AppModule],
        })
            .overrideProvider(SystemcontactsService)
            .useValue(sysContactService)
            .compile()
        app = moduleRef.createNestApplication()
        await app.init()
    })

    describe('/GET systemcontacts', () => {
        it('finds all unauthenticated', async () => {

            return request(app.getHttpServer())
                .get('/systemcontacts')
                .expect(HttpStatus.UNAUTHORIZED)
        })
        it('finds all valid', async () => {
            return request(app.getHttpServer())
                .get('/systemcontacts')
                .send({username: 'administrator', password: 'administrator'})
                .expect(200)
                .expect(
                    await sysContactService.readAll(1, 10),
                )
        })
        it('finds single valid id 1', async () => {
            return request(app.getHttpServer())
                .get('/systemcontacts/1')
                .send({username: 'administrator', password: 'administrator'})
                .expect(HttpStatus.OK)
                .expect(
                    await sysContactService.read(1),
                )
        })
        it('returns Not Found on single invalid id 0', async () => {
            return request(app.getHttpServer())
                .get('/systemcontacts/0')
                .send({username: 'administrator', password: 'administrator'})
                .expect(HttpStatus.NOT_FOUND)
        })
        it('returns bad request on invalid route parameters', async () => {
            return request(app.getHttpServer())
                .get('/systemcontacts/a')
                .send({username: 'administrator', password: 'administrator'})
                .expect(HttpStatus.BAD_REQUEST)
        })
        it('returns bad request on invalid query parameters', async () => {
            return request(app.getHttpServer())
                .get('/systemcontacts')
                .query({page: 'invalid', rows: 'parameter'})
                .send({username: 'administrator', password: 'administrator'})
                .expect(HttpStatus.BAD_REQUEST)
        })
    })

    afterAll(async () => {
        await app.close()
    })
})
