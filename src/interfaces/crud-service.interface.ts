export interface CrudService<CreateDTO, ResponseDTO> {
    create(entity: CreateDTO): Promise<ResponseDTO>

    readAll(page: string, rows: string): Promise<ResponseDTO[]>

    read(id: number): Promise<ResponseDTO>

    update(id: number, entity: CreateDTO): Promise<[number, ResponseDTO[]]>

    delete(id: number): Promise<number>
}

