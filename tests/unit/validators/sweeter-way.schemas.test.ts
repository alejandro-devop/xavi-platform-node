import { swAddListItemSchema } from '../../../src/validators/schemas/sweeter-way.schemas';

describe('swAddListItemSchema', () => {
  const listId = '0194a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';

  it('accepts item with only title', () => {
    const result = swAddListItemSchema.parse({
      listId,
      input: { title: 'Café Central' },
    });
    expect(result.input.title).toBe('Café Central');
    expect(result.input.address).toBeNull();
    expect(result.input.url).toBeNull();
    expect(result.input.description).toBeUndefined();
  });

  it('accepts empty address and url strings as null', () => {
    const result = swAddListItemSchema.parse({
      listId,
      input: {
        title: 'Parque',
        address: '   ',
        url: '',
      },
    });
    expect(result.input.address).toBeNull();
    expect(result.input.url).toBeNull();
  });

  it('accepts valid address and url when provided', () => {
    const result = swAddListItemSchema.parse({
      listId,
      input: {
        title: 'Museo',
        address: 'Calle Mayor 1',
        url: 'https://example.com/museo',
      },
    });
    expect(result.input.address).toBe('Calle Mayor 1');
    expect(result.input.url).toBe('https://example.com/museo');
  });

  it('rejects invalid url when non-empty', () => {
    expect(() =>
      swAddListItemSchema.parse({
        listId,
        input: { title: 'Lugar', url: 'not-a-url' },
      })
    ).toThrow();
  });
});
