import {
  applicationService,
  ShowUserCommand,
  ShowUserFailure,
} from '@apps/backend/src/application-service/show-user';
import type { User } from '@apps/backend/src/entity/user';
import {
  ErrorHttpStatusCode,
  FailureHttpStatusCode,
  FailureResponse,
  leftover,
  proxyHandler,
  responseBody,
  ServiceCommand,
  SuccessHttpStatusCode,
  SuccessResponse,
  UnknownErrorResponse,
} from '@libs/sup/src/aws-lambda';
import { userOfIdRepository } from '../src/repository/user/user-of-id';
import { DynamoDB } from 'aws-sdk';
import { captureAWSClient } from 'aws-xray-sdk-core';

const userTableName = process.env['USER_TABLE_NAME'];
if (!userTableName) {
  throw new Error('process.env: `USER_TABLE_NAME` not set');
}

const serviceCommand: ServiceCommand<ShowUserCommand> = (event) => ({
  userId: event.pathParameters?.['userId'] || '',
});

const ddbDocClient = captureAWSClient(new DynamoDB.DocumentClient());

const userOfId = userOfIdRepository({
  userTableName,
  ddbDocClient,
});

const serviceOutput = applicationService({
  userOfId,
});

interface ErrorResponseBody {
  message: string;
}

const failureResponse: FailureResponse<ShowUserFailure> = (error) => {
  switch (error.name) {
    case 'InvalidUserId':
      return {
        statusCode: FailureHttpStatusCode.BAD_REQUEST,
        body: responseBody<ErrorResponseBody>({
          message: error.message,
        }),
      };
    case 'UserNotFound':
      return {
        statusCode: FailureHttpStatusCode.NOT_FOUND,
        body: responseBody<ErrorResponseBody>({
          message: error.message,
        }),
      };
    default:
      throw leftover(error);
  }
};

interface OkResponseBody {
  userId: string;
}

const successResponse: SuccessResponse<User> = (user) => ({
  statusCode: SuccessHttpStatusCode.OK,
  body: responseBody<OkResponseBody>({
    userId: user.userId,
  }),
});

const unknownErrorResponse: UnknownErrorResponse = () => ({
  statusCode: ErrorHttpStatusCode.INTERNAL_SERVER_ERROR,
  body: responseBody<ErrorResponseBody>({
    message: 'Unknown Error',
  }),
});

export const handler = proxyHandler({
  serviceCommand,
  serviceOutput,
  failureResponse,
  successResponse,
  unknownErrorResponse,
});
