import {AppService} from '../../app.service'
import {Injectable, NotImplementedException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {FileshareCreateDto} from './dto/fileshare-create.dto'
import {FileshareResponseDto} from './dto/fileshare-response.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {fileshare} from '../../entities/db'
import {v4 as uuidv4} from 'uuid'
import {FindManyOptions} from 'typeorm'

@Injectable()
export class FileshareService implements CrudService<FileshareCreateDto, FileshareResponseDto> {
    constructor(
        private readonly app: AppService,
    ) {
    }

    filterOptions(req: ServiceRequest): FindManyOptions {
        let filter: FindManyOptions= {}
        if (['reseller', 'ccare'].includes(req.user.role))
            filter.where = { reseller_id: req.user.reseller_id }
        if (req.user.role == 'subscriber')
            filter.where = { subscriber_id: req.user.id }

        return filter
    }

    toResponse(db: db.fileshare.Upload, req: ServiceRequest): FileshareResponseDto {
        let response: FileshareResponseDto = {
            id: db.id,
            name: db.original_name,
            mime_type: db.mime_type,
            ttl: db.ttl,
            created_at: db.created_at,
            expires_at: db.expires_at,
            size: db.size
        }

        if (['system','admin','reseller'].includes(req.user.role))
            response.subscriber_id  = db.subscriber_id
        if (['system','admin'].includes(req.user.role))
            response.reseller_id = db.reseller_id

        return response
    }

    @HandleDbErrors
    async create(createDto: FileshareCreateDto, req: ServiceRequest, file: Express.Multer.File): Promise<FileshareResponseDto> {
        const filter = this.filterOptions(req)

        const totalQuota = this.app.config.fileshare.limits.quota
        if (totalQuota > 0) {
            const totalSize = await db.fileshare.Upload
                                .createQueryBuilder('info')
                                .select('info.data_length + info.index_length as size')
                                .from('information_schema.tables', 'info')
                                .where('table_schema = :db and table_name = :table', {
                                        db: "fileshare",
                                        table: "uploads"
                                })
                                .getRawOne()
            if (totalSize && totalSize['size'] + file.size > totalQuota)
                throw new UnprocessableEntityException('Quota exceeded')
        }

        const userFilesLimit = this.app.config.fileshare.limits.user_files
        if (userFilesLimit > 0) {
            const count = await db.fileshare.Upload.count(filter)
            if (count >= userFilesLimit)
                throw new UnprocessableEntityException('Files limit reached')
        }

        const userQuota = this.app.config.fileshare.limits.user_quota
        if (userQuota > 0) {
            const userSize = await db.fileshare.Upload
                                .createQueryBuilder('upload')
                                .select('SUM(upload.size) as sum')
                                .where(filter.where)
                                .getRawOne()
            if (userSize['sum'] + file.size > userQuota)
                throw new UnprocessableEntityException('Quota exceeded')
        }

        const now = new Date()
        const updateDate = new Date(now.getTime())
        const expireDate = new Date(now.getTime() + (createDto.ttl || 86400) * 1000)
        let upload = new fileshare.Upload()
        upload.id = uuidv4()
        upload.mime_type = file.mimetype
        upload.original_name = file.originalname
        upload.ttl = createDto.ttl || 86400
        upload.created_at = now
        upload.updated_at = updateDate
        upload.expires_at = expireDate
        upload.data = file.buffer
        upload.size = file.size
        upload.reseller_id = req.user.reseller_id

        if (req.user.role == 'subscriber')
            upload.subscriber_id = req.user.id

        await upload.save()

        return this.toResponse(upload, req)
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<FileshareResponseDto[]> {
        const filter = this.filterOptions(req)
        const result = await db.fileshare.Upload.find(
            {...filter, take: rows, skip: rows * (page - 1)},
        )

        return result.map(d => this.toResponse(d, req))
    }

    @HandleDbErrors
    async read(id: string): Promise<StreamableFile> {
        let upload = await db.fileshare.Upload.findOneOrFail(id)
        let stream = new StreamableFile(upload.data, {
            type: upload.mime_type,
            disposition: `attachment; filename="${upload.original_name}"; size=${upload.size}`
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
    async delete(id: string, req: ServiceRequest): Promise<string> {
        const filter = this.filterOptions(req)
        const upload = await db.fileshare.Upload.findOneOrFail(id, filter)
        await db.fileshare.Upload.delete(upload.id)

        return id
    }
}
