export class DbHelper {

    /**
     * `getEntryById` checks if an entry with `id` for `Model` `T` can be found.
     *
     * Returns db entry on success.
     *
     * Throws a `NotFoundException` if no entry is found
     *
     * Throws an `InternalServerErrorException` if ORM encounters an error
     *
     * @param repo Repository of `T`
     * @param id Primary key of entity
     * @return entry
     */
    // static async getEntryById<T extends BaseEntity>(repo: T, id: number, options?: FindOptions): Promise<T> {
    //     let entry: T
    //     try {

    //     } catch (err) {
    //         throw new InternalServerErrorException(handleSequelizeError(err))
    //     }
    //     if (!entry) {
    //         throw new NotFoundException()
    //     }
    //     return entry
    // }

    // static async getEntryWhere<T extends Model>(repo: Repository<T>, pattern: FindOptions): Promise<T> {
    //     try {
    //         return repo.findOne(pattern)
    //     } catch (err) {
    //         throw new BadRequestException(handleSequelizeError(err))
    //     }
    // }

    // static async getAllEntriesWhere<T extends Model>(repo: Repository<T>, pattern: FindOptions): Promise<T[]> {
    //     try {
    //         return repo.findAll(pattern)
    //     } catch (err) {
    //         throw new BadRequestException(handleSequelizeError(err))
    //     }
    // }
}
