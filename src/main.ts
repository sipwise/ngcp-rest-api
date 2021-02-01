import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import { Admin } from './modules/admins/admin.entity';
import { ValidateInputPipe } from './core/pipes/validate.pipe'

dotenv.config()

const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_CERT_KEY_FILE),
    cert: fs.readFileSync(process.env.SSL_CERT_FILE),
    ca: fs.readFileSync(process.env.SSL_CERT_FILE),
    requestCert: true,
    rejectUnauthorized: false,
}

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create(AppModule, {httpsOptions});

  const config = new DocumentBuilder()
    .setTitle("NGCP API")
    .setDescription("This is the NGCP API descritption")
    .setVersion('2.0')
    .addTag('NGCP')
    .build();

  // const options: SwaggerDocumentOptions = {
  //   extraModels: [Admin],
  // }
  //const document = SwaggerModule.createDocument(app, config, options);
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v2", app, document);

  app.setGlobalPrefix('api/v2');
  // app.useGlobalPipes(new ValidationPipe({
  //   transform: true,
  // }));
  app.useGlobalPipes(new ValidateInputPipe())
  await app.listen(3443);
}
bootstrap();
