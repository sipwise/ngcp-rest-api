import {Injectable,PipeTransform, UnprocessableEntityException} from '@nestjs/common'

@Injectable()
export class FileMimeTypePipe implements PipeTransform {
    constructor(
      private readonly allowedMimeTypes: string[],
    ) {}

    transform(file: Express.Multer.File): Express.Multer.File {
        if (!file) {
            return file
        }

        const isValidMimeType = this.allowedMimeTypes.includes(file.mimetype)
        if (!isValidMimeType) {
            throw new UnprocessableEntityException()
        }

        return file
    }
}
