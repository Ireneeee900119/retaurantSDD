import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const body = isHttp ? (exception.getResponse() as Record<string, unknown>) : {};

    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = isHttp ? (body.error as string) ?? 'ERROR' : 'INTERNAL_ERROR';
    const message = isHttp ? (body.message as string) ?? exception.message : 'Internal server error';

    response.status(status).json({ error, message });
  }
}
