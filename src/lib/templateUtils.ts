import type { GridTemplate } from '@/context/CollageContext';

const squareModules = import.meta.glob('../components/square/*.tsx');
const hexagonSvgModules = import.meta.glob('../components/hexagon/*.svg', { as: 'raw' });

export type TemplateOption = { type: GridTemplate; path: string };

function getHexagonSvgPath(n: number): string | null {
  const expected = `${n}.svg`;
  return (
    Object.keys(hexagonSvgModules).find(
      (k) => k.endsWith(expected) || k.includes(`hexagon/${expected}`)
    ) ?? null
  );
}

/** Get available templates (square, hexagonal) for a given member count */
export function getAvailableTemplates(n: number): TemplateOption[] {
  const templates: TemplateOption[] = [];

  const squareKey = Object.keys(squareModules).find(
    (k) => k.includes(`square/${n}.tsx`) || k.endsWith(`/${n}.tsx`)
  );
  if (squareKey) {
    templates.push({ type: 'square', path: squareKey });
  }

  const hexagonSvgPath = getHexagonSvgPath(n);
  if (hexagonSvgPath) {
    templates.push({ type: 'hexagonal', path: hexagonSvgPath });
  }

  return templates;
}

/** Get initial template index, preferring the given template type if available */
export function getInitialTemplateIndex(
  templates: TemplateOption[],
  preferred?: GridTemplate
): number {
  if (templates.length === 0) return 0;
  if (preferred) {
    const idx = templates.findIndex((t) => t.type === preferred);
    if (idx >= 0) return idx;
  }
  return 0;
}
