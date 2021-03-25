import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidateInputPipe } from './core/pipes/validate.pipe'
import { AppClusterService } from './app-cluster.service';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import {FastifyAdapter} from "@nestjs/platform-fastify";

dotenv.config()

const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_CERT_KEY_FILE),
    cert: fs.readFileSync(process.env.SSL_CERT_FILE),
    ca: fs.readFileSync(process.env.SSL_CERT_FILE),
    requestCert: true,
    rejectUnauthorized: false,
}

async function bootstrap() {
  const app = await NestFactory.create(
      AppModule,
      new FastifyAdapter({https: httpsOptions}),

  );

  // const config = new DocumentBuilder()
  //   .setTitle("NGCP API")
  //   .setDescription("This is the NGCP API description")
  //   .setVersion('2.0')
  //   .addTag('NGCP')
  //   .build();

  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup(process.env.API_PREFIX, app, document);

  app.setGlobalPrefix(process.env.API_PREFIX);
  app.useGlobalPipes(new ValidateInputPipe())
  app.useGlobalInterceptors(new TransformInterceptor({pageName: process.env.API_DEFAULT_QUERY_PAGE_NAME, perPageName: process.env.API_DEFAULT_QUERY_ROWS_NAME}))
  await app.listen(process.env.API_PORT, '0.0.0.0');
}
AppClusterService.clusterize(bootstrap);
