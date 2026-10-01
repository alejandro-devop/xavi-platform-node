import { GraphQLError } from 'graphql';
import { userSettingsResolvers } from '../../../../src/graphql/modules/user-settings/user-settings.resolvers';
import { userSettingsService } from '../../../../src/services/user-settings.service';

jest.mock('../../../../src/services/user-settings.service');

const mockService = userSettingsService as jest.Mocked<typeof userSettingsService>;

describe('User settings resolvers — vidaPomodoro', () => {
  const mockContext = { user: { id: '1', email: 'test@example.com' } };
  const CAT = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
  const pomodoro = {
    enabled: true,
    categoryIds: [CAT, CAT],
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: null,
    longBreakEvery: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockService.updateMySettings.mockResolvedValue({} as never);
  });

  it('passes the validated (deduplicated) Pomodoro to the service', async () => {
    await userSettingsResolvers.Mutation.updateMySettings(
      null,
      { input: { vidaPomodoro: pomodoro } },
      mockContext as never
    );

    expect(mockService.updateMySettings).toHaveBeenCalledWith(1, {
      vidaPomodoro: { ...pomodoro, categoryIds: [CAT] },
    });
  });

  it('passes an explicit null through to clear the column', async () => {
    await userSettingsResolvers.Mutation.updateMySettings(
      null,
      { input: { vidaPomodoro: null } },
      mockContext as never
    );

    expect(mockService.updateMySettings).toHaveBeenCalledWith(1, { vidaPomodoro: null });
  });

  it('rejects an invalid Pomodoro with BAD_USER_INPUT like the rest of the module', async () => {
    const error = await userSettingsResolvers.Mutation.updateMySettings(
      null,
      { input: { vidaPomodoro: { ...pomodoro, workMinutes: 2 } } },
      mockContext as never
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GraphQLError);
    expect((error as GraphQLError).extensions.code).toBe('BAD_USER_INPUT');
    expect((error as GraphQLError).extensions.validationErrors).toEqual([
      expect.objectContaining({ path: ['vidaPomodoro', 'workMinutes'] }),
    ]);
    expect(mockService.updateMySettings).not.toHaveBeenCalled();
  });
});
