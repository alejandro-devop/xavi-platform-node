/**
 * Sugerir la categoría a partir de la descripción, sin IA.
 *
 * Es la misma lógica que `category_suggester.dart` de xavi-wallet-flutter
 * (la app la usa mientras se escribe). Aquí la usa la captura desde fuera de
 * la app —Siri, Apple Pay—, donde no hay pantalla para sugerir: se toma la
 * primera. **Si se cambia una, se cambia la otra**; las pruebas de las dos usan
 * los mismos casos.
 *
 * Tres pasos: la misma descripción ya usada, votos por palabra (la última vale
 * a medio escribir) y el nombre de la categoría.
 */

export interface HistoryEntry {
  description: string;
  categoryId: string;
  uses: number;
}

export interface SuggestableCategory {
  id: string;
  name: string;
}

export interface CategorySuggestion {
  categoryId: string;
  score: number;
}

const TILDES: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

// prettier-ignore
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'para', 'por', 'con', 'un', 'una', 'al', 'a',
  'mi', 'mis', 'su', 'sus', 'pago', 'cuota', 'mes', 'enero', 'ene', 'febrero', 'feb', 'marzo',
  'mar', 'abril', 'abr', 'mayo', 'may', 'junio', 'jun', 'julio', 'jul', 'agosto', 'ago',
  'septiembre', 'setiembre', 'sept', 'sep', 'octubre', 'oct', 'noviembre', 'nov', 'diciembre',
  'dic',
]);

export function palabrasClave(texto: string): string[] {
  const limpio = [...texto.toLowerCase()].map((c) => TILDES[c] ?? c).join('');
  return limpio.split(/[^a-z]+/).filter((p) => p.length >= 2 && !VACIAS.has(p));
}

/** 1 + log2(n) entero, igual que en Dart. */
function log2(n: number): number {
  let r = 1;
  let x = n;
  while (x > 1) {
    x = Math.floor(x / 2);
    r += 1;
  }
  return r;
}

export function suggestCategories(
  descripcion: string,
  history: HistoryEntry[],
  categories: SuggestableCategory[],
  max = 2
): CategorySuggestion[] {
  const nombres = new Map(categories.map((c) => [c.id, palabrasClave(c.name)]));
  const exactas = new Map<string, Map<string, number>>();
  const porPalabra = new Map<string, Map<string, number>>();
  const sumarEn = (m: Map<string, Map<string, number>>, k: string, id: string, n: number) => {
    const votos = m.get(k) ?? new Map<string, number>();
    votos.set(id, (votos.get(id) ?? 0) + n);
    m.set(k, votos);
  };
  for (const e of history) {
    if (!nombres.has(e.categoryId) || e.uses <= 0) continue;
    const palabras = palabrasClave(e.description);
    if (palabras.length === 0) continue;
    sumarEn(exactas, palabras.join(' '), e.categoryId, e.uses);
    for (const p of new Set(palabras)) sumarEn(porPalabra, p, e.categoryId, e.uses);
  }

  const palabras = palabrasClave(descripcion);
  if (palabras.length === 0 || palabras.join('').length < 3) return [];

  const puntos = new Map<string, number>();
  const sumar = (id: string, p: number) => puntos.set(id, (puntos.get(id) ?? 0) + p);
  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  const exacta = exactas.get(palabras.join(' '));
  exacta?.forEach((usos, id) => sumar(id, 10 * usos));

  palabras.forEach((p, i) => {
    const votos = porPalabra.get(p);
    if (votos) {
      const t = total(votos);
      votos.forEach((usos, id) => sumar(id, ((2 * usos) / t) * log2(t)));
    } else if (i === palabras.length - 1 && p.length >= 3) {
      for (const [palabra, v] of porPalabra) {
        if (!palabra.startsWith(p)) continue;
        const t = total(v);
        v.forEach((usos, id) => sumar(id, (usos / t) * log2(t)));
      }
    }
  });

  nombres.forEach((nombre, id) => {
    for (const p of palabras) {
      if (nombre.includes(p)) sumar(id, 1.5);
      else if (p.length >= 3 && nombre.some((n) => n.startsWith(p))) sumar(id, 0.75);
    }
  });

  if (puntos.size === 0) return [];
  // Estable ante empates: Map conserva el orden de inserción y sort es estable.
  const orden = [...puntos.entries()].sort((a, b) => b[1] - a[1]);
  const mejor = orden[0][1];
  return orden
    .slice(0, max)
    .filter(([, s]) => s >= mejor * 0.25)
    .map(([categoryId, score]) => ({ categoryId, score }));
}
