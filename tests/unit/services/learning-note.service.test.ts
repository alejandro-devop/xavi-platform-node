import { slugifyLearningTagName } from '../../../src/services/learning-note.service';
import {
  learningNoteAddInputSchema,
  learningNoteEditInputSchema,
  learningNotesListArgsSchema,
} from '../../../src/validators/schemas/learning-note.schemas';
import { BadRequestError } from '../../../src/shared/errors';

describe('slugifyLearningTagName', () => {
  it('normalizes accents and case', () => {
    expect(slugifyLearningTagName('  Arquitectura PHP  ')).toBe('arquitectura-php');
    expect(slugifyLearningTagName('Patrón')).toBe('patron');
  });

  it('rejects names without alphanumeric characters', () => {
    expect(() => slugifyLearningTagName('!!!')).toThrow(BadRequestError);
  });
});

describe('learning-note schemas', () => {
  it('accepts create input', () => {
    const parsed = learningNoteAddInputSchema.parse({
      title: 'PHP traits',
      contentMarkdown: '# intro',
      tagIds: ['1', '2'],
    });
    expect(parsed.title).toBe('PHP traits');
  });

  it('requires at least one edit field', () => {
    expect(() => learningNoteEditInputSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' })).toThrow();
  });

  it('validates tag slugs on list args', () => {
    const parsed = learningNotesListArgsSchema.parse({
      search: 'php',
      tags: ['php', 'arquitectura'],
      page: 1,
      limit: 20,
    });
    expect(parsed.tags).toEqual(['php', 'arquitectura']);
    expect(() => learningNotesListArgsSchema.parse({ tags: ['PHP'] })).toThrow();
  });
});
