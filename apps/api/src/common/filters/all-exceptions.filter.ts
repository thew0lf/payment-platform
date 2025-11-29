import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const path = httpAdapter.getRequestUrl(request);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        message = (response as any).message || message;
        error = (response as any).error || exception.name;
      }
      error = exception.name.replace('Exception', ' Error').trim();
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = this.handlePrismaError(exception);
      message = this.getPrismaErrorMessage(exception);
      error = 'Database Error';
    }
    // Handle validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';
    }
    // Handle other errors
    else if (exception instanceof Error) {
      message = 'An unexpected error occurred';
      // Log the actual error internally
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Log all errors with appropriate level
    if (statusCode >= 500) {
      this.logger.error(
        `${statusCode} ${path}: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(`${statusCode} ${path}: ${message}`);
    }

    const responseBody: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): number {
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2014': // Required relation violation
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (exception.code) {
      case 'P2002':
        const target = (exception.meta?.target as string[])?.join(', ') || 'field';
        return `A record with this ${target} already exists`;
      case 'P2025':
        return 'The requested record was not found';
      case 'P2003':
        return 'Invalid reference to related record';
      case 'P2014':
        return 'Required related record is missing';
      default:
        return 'A database error occurred';
    }
  }
}
