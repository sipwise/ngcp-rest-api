import {AppService} from '../../app.service'
import {Inject, Injectable, NotImplementedException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {FileshareRequestDto} from './dto/fileshare-request.dto'
import {FileshareResponseDto} from './dto/fileshare-response.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {fileshare} from '../../entities/db'
import {v4 as uuidv4} from 'uuid'
import {FindManyOptions} from 'typeorm'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {I18nService} from 'nestjs-i18n'

@Injectable()
export class FileshareService { // implements CrudService<FileshareRequestDto, FileshareResponseDto> {
    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    filterOptions(sr: ServiceRequest): FindManyOptions {
        const filter: FindManyOptions = {}
        if (['reseller', 'ccare'].includes(sr.user.role))
            filter.where = {reseller_id: sr.user.reseller_id}
        if (sr.user.role == 'subscriber')
            filter.where = {subscriber_id: sr.user.id}

        return filter
    }

    toResponse(db: db.fileshare.Upload, sr: ServiceRequest): FileshareResponseDto {
        const response: FileshareResponseDto = {
            id: db.id,
            name: db.original_name,
            mime_type: db.mime_type,
            ttl: db.ttl,
            created_at: db.created_at,
            expires_at: db.expires_at,
            size: db.size,
        }

        if (['system', 'admin', 'reseller'].includes(sr.user.role))
            response.subscriber_id = db.subscriber_id
        if (['system', 'admin'].includes(sr.user.role))
            response.reseller_id = db.reseller_id

        return response
    }

    @HandleDbErrors
    async create(createDto: FileshareRequestDto, sr: ServiceRequest, file: Express.Multer.File): Promise<FileshareResponseDto> {
        const filter = this.filterOptions(sr)

        const totalQuota = this.app.config.fileshare.limits.quota
        if (totalQuota > 0) {
            const totalSize = await db.fileshare.Upload
                .createQueryBuilder('info')
                .select('info.data_length + info.index_length as size')
                .from('information_schema.tables', 'info')
                .where('table_schema = :db and table_name = :table', {
                    db: 'fileshare',
                    table: 'uploads',
                })
                .getRawOne()
            if (totalSize && totalSize['size'] + file.size > totalQuota)
                throw new UnprocessableEntityException(this.i18n.t('errors.QUOTA_EXCEEDED'))
        }

        const userFilesLimit = this.app.config.fileshare.limits.user_files
        if (userFilesLimit > 0) {
            const count = await db.fileshare.Upload.count(filter)
            if (count >= userFilesLimit)
                throw new UnprocessableEntityException(this.i18n.t('errors.FILES_LIMIT_REACHED'))
        }

        const userQuota = this.app.config.fileshare.limits.user_quota
        if (userQuota > 0) {
            const userSize = await db.fileshare.Upload
                .createQueryBuilder('upload')
                .select('SUM(upload.size) as sum')
                .where(filter.where)
                .getRawOne()
            if (userSize['sum'] + file.size > userQuota)
                throw new UnprocessableEntityException(this.i18n.t('errors.QUOTA_EXCEEDED'))
        }

        const now = new Date()
        const updateDate = new Date(now.getTime())
        const expireDate = new Date(now.getTime() + (createDto.ttl || 86400) * 1000)
        const upload = new fileshare.Upload()
        upload.id = uuidv4()
        upload.mime_type = file.mimetype
        upload.original_name = file.originalname
        upload.ttl = createDto.ttl || 86400
        upload.created_at = now
        upload.updated_at = updateDate
        upload.expires_at = expireDate
        upload.data = file.buffer
        upload.size = file.size
        upload.reseller_id = sr.user.reseller_id

        if (sr.user.role == 'subscriber')
            upload.subscriber_id = sr.user.id

        await upload.save()

        return this.toResponse(upload, sr)
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[FileshareResponseDto[], number]> {
        const filter = this.filterOptions(sr)
        const totalCount = await db.fileshare.Upload.count(
            {...filter},
        )
        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        const result = await db.fileshare.Upload.find(
            {...filter, take: rows, skip: rows * (page - 1)},
        )
        return [result.map(d => this.toResponse(d, sr)), totalCount]
    }

    @HandleDbErrors
    async read(id: string): Promise<StreamableFile> {
        const upload = await db.fileshare.Upload.findOneByOrFail({ id: id })
        const stream = new StreamableFile(upload.data, {
            type: upload.mime_type,
            disposition: `attachment; filename="${upload.original_name}"; size=${upload.size}`,
        })

        return stream
    }

    @HandleDbErrors
    async update(): Promise<FileshareResponseDto> {
        throw new NotImplementedException()
    }

    @HandleDbErrors
    async adjust(): Promise<FileshareResponseDto> {
        throw new NotImplementedException()
    }

    @HandleDbErrors
    async delete(ids: string[], sr: ServiceRequest): Promise<string[]> {
        const filter = this.filterOptions(sr)
        const qb = db.fileshare.Upload.createQueryBuilder('fileshare')
        qb.andWhere(filter)
        qb.whereInIds(ids)

        const uploads = await qb.getMany()

        if (ids.length != uploads.length)
            throw new UnprocessableEntityException()

        const deleteQb = qb.delete().whereInIds(ids)

        await deleteQb.execute()

        return ids
    }
}
