import {
  TODO_DESCRIPTION_MAX_LENGTH,
  todoAddInputSchema,
  todoEditInputSchema,
} from '../../../src/validators/schemas/todo.schemas';

describe('todo description validation', () => {
  it('accepts description at max length', () => {
    const description = 'a'.repeat(TODO_DESCRIPTION_MAX_LENGTH);
    const add = todoAddInputSchema.parse({ title: 'Task', description });
    const edit = todoEditInputSchema.parse({ id: '10', description });

    expect(add.description).toBe(description);
    expect(edit.description).toBe(description);
  });

  it('rejects description over max length on add', () => {
    const description = 'a'.repeat(TODO_DESCRIPTION_MAX_LENGTH + 1);
    expect(() => todoAddInputSchema.parse({ title: 'Task', description })).toThrow();
  });

  it('rejects description over max length on edit', () => {
    const description = 'a'.repeat(TODO_DESCRIPTION_MAX_LENGTH + 1);
    expect(() => todoEditInputSchema.parse({ id: '10', description })).toThrow();
  });

  it('accepts null description on edit', () => {
    const edit = todoEditInputSchema.parse({ id: '10', description: null });
    expect(edit.description).toBeNull();
  });
});
