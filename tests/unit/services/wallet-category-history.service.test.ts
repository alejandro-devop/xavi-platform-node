jest.mock('../../../src/shared/database/drizzle', () => ({
  getDb: jest.fn(),
  getDrizzlePool: jest.fn(() => ({ query: jest.fn() })),
}));

import {
  CATEGORY_HISTORY_LIMIT,
  mergeCategoryHistory,
} from '../../../src/services/wallet-category-history.service';

const row = (description: string, categoryId: string, uses: number, lastUsed: string) => ({
  description,
  categoryId,
  uses,
  lastUsed,
});

describe('mergeCategoryHistory', () => {
  it('suma los usos de movimientos y programados con la misma descripción y categoría', () => {
    const merged = mergeCategoryHistory(
      [row('arriendo', 'servicios', 3, '2026-08-26')],
      [row('arriendo', 'servicios', 1, '2026-10-26')]
    );
    expect(merged).toEqual([row('arriendo', 'servicios', 4, '2026-10-26')]);
  });

  it('no mezcla la misma descripción en categorías distintas', () => {
    const merged = mergeCategoryHistory([
      row('mercado', 'hogar', 5, '2026-09-01'),
      row('mercado', 'comida', 1, '2026-09-20'),
    ]);
    expect(merged.map((r) => r.categoryId)).toEqual(['comida', 'hogar']);
  });

  it('deja primero lo más reciente y, en empate, lo más usado', () => {
    const merged = mergeCategoryHistory([
      row('a', '1', 1, '2026-09-01'),
      row('b', '1', 9, '2026-09-01'),
      row('c', '1', 1, '2026-09-10'),
    ]);
    expect(merged.map((r) => r.description)).toEqual(['c', 'b', 'a']);
  });

  it('descarta descripciones vacías', () => {
    expect(mergeCategoryHistory([row('', '1', 2, '2026-09-01')])).toEqual([]);
  });

  it('corta en el tope', () => {
    const muchas = Array.from({ length: CATEGORY_HISTORY_LIMIT + 5 }, (_, i) =>
      row(`g${i}`, '1', 1, '2026-09-01')
    );
    expect(mergeCategoryHistory(muchas)).toHaveLength(CATEGORY_HISTORY_LIMIT);
  });
});
