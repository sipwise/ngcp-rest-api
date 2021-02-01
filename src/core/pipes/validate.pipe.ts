import {
    Injectable, ArgumentMetadata, BadRequestException, ValidationPipe, UnprocessableEntityException
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidateInputPipe extends ValidationPipe {
   public async transform(value: any, metadata: ArgumentMetadata) {
     if (this.isEmpty(value)) {
        throw new BadRequestException()
     }
     const object = plainToClass(metadata.metatype, value);

     const errors = await validate(object);
     if (errors.length > 0) {
        throw new UnprocessableEntityException(this.formatErrors(errors));
     }
     return value;
   }

   private formatErrors(errors: any[]) {
      const data = new Map();
      errors.forEach( err => {
         for (let key in err.constraints) {
            // TODO set hash instead of string
            let hash = {}
            hash[key] = err.constraints[key];
            if (data.has(err.property)) {
               data.get(err.property).push(hash);
            } else {
               data.set(err.property, [hash]);
            }
         }
      });
      const message = []
      for (const [k,v] of data) {
         let hash = {}
         hash[k] = v;
         message.push(hash);
      }
      return message;
   }

   private isEmpty(value: any) {
      return Object.keys(value).length < 1
   }
}