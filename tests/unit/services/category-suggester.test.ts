import { palabrasClave, suggestCategories } from '../../../src/services/category-suggester';

// Los mismos casos que test/features/categories/category_suggester_test.dart
// de xavi-wallet-flutter: las dos implementaciones tienen que coincidir.
const h = (description: string, categoryId: string, uses = 1) => ({
  description,
  categoryId,
  uses,
});

const categorias = [
  { id: 'servicios', name: 'Servicios' },
  { id: 'hogar', name: 'Hogar y mercado' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'comida', name: 'Comida' },
];

const historial = [
  h('arriendo', 'servicios', 4),
  h('arriendo sept', 'hogar'),
  h('gasolina', 'transporte', 3),
  h('gasolina terpel', 'transporte'),
  h('almuerzo', 'comida', 5),
  h('categoría borrada', 'no-existe', 9),
];

const ids = (texto: string) =>
  suggestCategories(texto, historial, categorias).map((s) => s.categoryId);

describe('palabrasClave', () => {
  it('limpia minúsculas, tildes, números, meses y palabras vacías', () => {
    expect(palabrasClave('Arriendo de Sept 2026')).toEqual(['arriendo']);
    expect(palabrasClave('Almuerzo en el CAFÉ')).toEqual(['almuerzo', 'cafe']);
    expect(palabrasClave('Cuota #3 - Teléfono')).toEqual(['telefono']);
  });
});

describe('suggestCategories', () => {
  it('la misma descripción gana, aunque traiga el mes', () => {
    expect(ids('Arriendo octubre')[0]).toBe('servicios');
  });

  it('ofrece la segunda si le hace sombra a la primera', () => {
    expect(ids('Arriendo')).toEqual(['servicios', 'hogar']);
  });

  it('por palabras, con un comercio que nunca salió', () => {
    expect(ids('Gasolina Primax')[0]).toBe('transporte');
  });

  it('la última palabra vale a medio escribir', () => {
    expect(ids('gasol')[0]).toBe('transporte');
  });

  it('sin historial, por el nombre de la categoría', () => {
    expect(ids('Mercado del mes')[0]).toBe('hogar');
  });

  it('nada que decir: vacío', () => {
    expect(ids('xyz qwerty')).toEqual([]);
    expect(ids('de')).toEqual([]);
    expect(ids('')).toEqual([]);
  });

  it('no sugiere categorías que ya no existen', () => {
    expect(ids('categoría borrada')).not.toContain('no-existe');
  });
});
