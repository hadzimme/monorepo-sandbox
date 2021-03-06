import 'source-map-support/register';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { setLogger } from 'aws-xray-sdk-core';
import {
  BusinessError,
  isFailure,
  buildLogger,
  Result,
  ServiceOutput,
  Logger,
} from '@libs/sup/src';

export const SuccessHttpStatusCode = {
  OK: 200,
  CREATED: 201,
} as const;

export const FailureHttpStatusCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const;

export const ErrorHttpStatusCode = {
  INTERNAL_SERVER_ERROR: 500,
} as const;

type SuccessHttpStatusCode =
  typeof SuccessHttpStatusCode[keyof typeof SuccessHttpStatusCode];
type FailureHttpStatusCode =
  typeof FailureHttpStatusCode[keyof typeof FailureHttpStatusCode];
type ErrorHttpStatusCode =
  typeof ErrorHttpStatusCode[keyof typeof ErrorHttpStatusCode];

interface SuccessHttpResponse extends APIGatewayProxyResult {
  statusCode: SuccessHttpStatusCode;
}

interface FailureHttpResponse extends APIGatewayProxyResult {
  statusCode: FailureHttpStatusCode;
}

interface ErrorHttpResponse extends APIGatewayProxyResult {
  statusCode: ErrorHttpStatusCode;
}

export const responseBody = <T>(response: T): string => {
  return JSON.stringify(response);
};

interface DefinedJson<T> {
  toJSON?: () => T;
}

export interface ServiceCommand<T> {
  (event: APIGatewayProxyEvent): T & DefinedJson<T>;
}

export interface FailureResponse<E extends BusinessError> {
  (failure: E): FailureHttpResponse;
}

export interface SuccessResponse<T> {
  (success: T): SuccessHttpResponse;
}

export interface UnknownErrorResponse {
  (error: unknown): ErrorHttpResponse;
}

export const leftover = (error: never): never => error;

interface ProxyHandlerProps<T, E extends BusinessError, U> {
  serviceCommand: ServiceCommand<T>;
  serviceOutput: ServiceOutput<T, Result<E, U>>;
  failureResponse: FailureResponse<E>;
  successResponse: SuccessResponse<U>;
  unknownErrorResponse: UnknownErrorResponse;
  logger?: Logger;
}

interface ProxyHandler {
  <T, E extends BusinessError, U>(
    props: ProxyHandlerProps<T, E, U>
  ): APIGatewayProxyHandler;
}

export const proxyHandler: ProxyHandler = ({
  serviceCommand,
  serviceOutput,
  failureResponse,
  successResponse,
  unknownErrorResponse,
  logger,
}) => {
  const handlerLogger = logger || buildLogger();
  setLogger(handlerLogger);
  return async (event) => {
    try {
      handlerLogger.info(event);
      const command = serviceCommand(event);
      const result = await serviceOutput(command);
      if (isFailure(result)) {
        handlerLogger.warn(result);
        return failureResponse(result.resultValue);
      }
      handlerLogger.info(result);
      return successResponse(result.resultValue);
    } catch (error) {
      handlerLogger.error(error);
      return unknownErrorResponse(error);
    }
  };
};
