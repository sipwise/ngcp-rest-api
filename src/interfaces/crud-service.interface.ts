import {Operation as PatchOperation} from 'fast-json-patch'

export interface CrudService<CreateDTO, ResponseDTO> {
    create(dto: CreateDTO): Promise<ResponseDTO>

    readAll(page: string, rows: string): Promise<ResponseDTO[]>

    read(id: number): Promise<ResponseDTO>

    update(id: number, dto: CreateDTO): Promise<ResponseDTO>

    adjust(id: number, patch: PatchOperation[]): Promise<ResponseDTO>

    delete(id: number): Promise<number>
}

