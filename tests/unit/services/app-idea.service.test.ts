import {
  appIdeaAddInputSchema,
  appIdeaEditInputSchema,
  appIdeasListArgsSchema,
} from '../../../src/validators/schemas/app-idea.schemas';

describe('app-idea schemas', () => {
  it('accepts create input', () => {
    const parsed = appIdeaAddInputSchema.parse({
      title: 'Habit companion',
      contentMarkdown: '# Idea\n\nUna app para hábitos.',
      status: 'exploring',
    });
    expect(parsed.title).toBe('Habit companion');
    expect(parsed.status).toBe('exploring');
  });

  it('defaults status as optional on create', () => {
    const parsed = appIdeaAddInputSchema.parse({ title: 'Solo título' });
    expect(parsed.status).toBeUndefined();
  });

  it('requires at least one edit field', () => {
    expect(() =>
      appIdeaEditInputSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).toThrow();
  });

  it('rejects invalid status on list args', () => {
    expect(() => appIdeasListArgsSchema.parse({ status: 'pending' })).toThrow();
    const parsed = appIdeasListArgsSchema.parse({
      search: 'hábitos',
      status: 'draft',
      page: 1,
      limit: 20,
    });
    expect(parsed.status).toBe('draft');
  });
});
