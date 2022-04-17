import { isFailure, isSuccess, Result } from '@libs/sup';
import { User } from '../entity/user';
import { UserOfId } from '../repository/user';
import {
  applicationService,
  InvalidUserId,
  ShowUserFailure,
  UserNotFound,
} from './show-user';

const userOfIdSuccess = async () => {
  const user: User = {
    userId: 'Dummy User',
  };
  return await Promise.resolve(user);
};

describe('ユースケース：ユーザー情報を表示する', () => {
  let userOfId: UserOfId;
  let result: Result<ShowUserFailure, User>;

  describe('正常系', () => {
    beforeEach(async () => {
      userOfId = jest.fn(userOfIdSuccess);
      const serviceOutput = applicationService({
        userOfId,
      });
      result = await serviceOutput({ userId: 'Dummy User' });
    });

    test('結果が成功であること', () => {
      expect(isSuccess(result)).toBeTruthy();
    });

    test('結果の値としてユーザー情報が返却されること', () => {
      if (isFailure(result)) {
        throw new Error();
      }
      expect(result.resultValue.userId).toStrictEqual('Dummy User');
    });

    test('userOfIdがコールされること', () => {
      expect(userOfId).toBeCalledWith('Dummy User');
    });
  });

  describe('準正常系：正しいユーザーIDが渡されなかった場合', () => {
    beforeEach(async () => {
      userOfId = jest.fn(userOfIdSuccess);
      const serviceOutput = applicationService({
        userOfId,
      });
      result = await serviceOutput({ userId: '' });
    });

    test('結果が失敗であること', () => {
      expect(isFailure(result)).toBeTruthy();
    });

    test('結果の値としてInvalidUserIdオブジェクトが返却されること', () => {
      if (isSuccess(result)) {
        throw new Error();
      }
      expect(result.resultValue).toBeInstanceOf(InvalidUserId);
    });

    test('userOfIdがコールされないこと', () => {
      expect(userOfId).not.toBeCalled();
    });
  });

  describe('準正常系：ユーザー情報が存在しない場合', () => {
    beforeEach(async () => {
      userOfId = jest.fn(async () => await Promise.resolve(undefined));
      const serviceOutput = applicationService({
        userOfId,
      });
      result = await serviceOutput({ userId: 'Dummy User' });
    });

    test('結果が失敗であること', () => {
      expect(isFailure(result)).toBeTruthy();
    });

    test('結果の値としてUserNotFoundオブジェクトが返却されること', () => {
      if (isSuccess(result)) {
        throw new Error();
      }
      expect(result.resultValue).toBeInstanceOf(UserNotFound);
    });

    test('userOfIdがコールされること', () => {
      expect(userOfId).toBeCalledWith('Dummy User');
    });
  });

  describe('異常系：userOfIdが異常終了した場合', () => {
    test('異常終了すること', async () => {
      userOfId = jest.fn(async () => await Promise.reject(new Error()));
      const serviceOutput = applicationService({
        userOfId,
      });
      await expect(serviceOutput({ userId: 'Dummy User' })).rejects.toThrow();
    });
  });
});