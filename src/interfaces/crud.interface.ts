export interface CrudRepository<M> {
    create(entity: M): Promise<M>

    readAll(page: string, row: string): Promise<M[]>

    read(page: string, row: string, id: number): Promise<M>

    update(id: number, entity: M): Promise<[number, M[]]>

    delete(id: number)
}

