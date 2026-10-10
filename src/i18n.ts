import type { Lang } from './lib/state'

export type T = (s: string, ...args: (string | number)[]) => string

/** Marks a string for translation where it is defined away from its t() call. */
export const N = (s: string) => s

/** English source string → Ukrainian. `{0}`, `{1}` are placeholders for interpolated values. */
export const UK: Record<string, string> = {
  'Voronoi lamp generator': 'Генератор ламп Вороного',
  'Parametric lamp shades and shells with Voronoi openings, ready to 3D print.': 'Параметричні абажури й оболонки з отворами Вороного, готові до 3D-друку.',
  'Runs entirely in your browser. Nothing is uploaded.': 'Працює повністю у браузері. Нічого не завантажується.',
  'Source on GitHub': 'Код на GitHub',
  Presets: 'Шаблони',
  'Classic cylinder': 'Класичний циліндр',
  'Lampshade cone': 'Конічний абажур',
  Globe: 'Куля',
  'Belly vase': 'Ваза з животом',
  Hourglass: 'Пісочний годинник',
  Tulip: 'Тюльпан',
  Shape: 'Форма',
  'Cylinder / cone': 'Циліндр / конус',
  Sphere: 'Сфера',
  'Vase profile': 'Профіль вази',
  Height: 'Висота',
  'Bottom radius': 'Радіус знизу',
  'Top radius': 'Радіус згори',
  Radius: 'Радіус',
  'Opening angle': 'Кут зрізу',
  'Angle cut off at the top and bottom of the sphere.': 'Кут, зрізаний на верхівці й знизу сфери.',
  'Radius at {0}% of the height': 'Радіус на {0}% висоти',
  Openings: 'Отвори',
  Cells: 'Комірки',
  Seed: 'Зерно',
  Randomize: 'Випадково',
  'Same seed, same lamp.': 'Те саме зерно — та сама лампа.',
  'Relaxation (Lloyd)': 'Вирівнювання (Ллойд)',
  'More passes make the cells rounder and more even.': 'Більше проходів — комірки округліші й рівніші.',
  'Rib width': 'Ширина перемичок',
  'Material left between two openings.': 'Матеріал між двома отворами.',
  'Corner radius': 'Радіус кутів',
  'Solid rim': 'Суцільний обідок',
  'Closed band at the top and bottom edge.': 'Закрита смуга біля верхнього й нижнього краю.',
  'Cells left closed': 'Закриті комірки',
  Wall: 'Стінка',
  'Wall thickness': 'Товщина стінки',
  'Limited to {0} mm by the radius.': 'Обмежено радіусом до {0} мм.',
  'Closed bottom plate': 'Закрите дно',
  'Smoothness (facets)': 'Гладкість (грані)',
  Settings: 'Налаштування',
  Language: 'Мова',
  Theme: 'Тема',
  System: 'Системна',
  Light: 'Світла',
  Dark: 'Темна',
  mm: 'мм',
  '3D preview of the lamp': '3D-перегляд лампи',
  'Lamp on': 'Лампа ввімкнена',
  'Reset view': 'Скинути вигляд',
  'Download STL': 'Завантажити STL',
  'Building the solid…': 'Будуємо модель…',
  'Could not build the model: {0}': 'Не вдалося побудувати модель: {0}',
  Model: 'Модель',
  'Openings cut': 'Вирізано отворів',
  'Open area': 'Площа отворів',
  Size: 'Розмір',
  Triangles: 'Трикутники',
  Volume: 'Об’єм',
  'About {0} g in PLA': 'Приблизно {0} г у PLA',
  'Watertight (manifold)': 'Герметична (manifold)',
  Yes: 'Так',
  No: 'Ні',
  'Flat pattern': 'Розгортка',
  'The wall rolled out flat. Left and right edges meet at the seam. Dots are the seeds.':
    'Стінка, розгорнута на площині. Ліве й праве краї сходяться на шві. Крапки — зерна.',
  'Download pattern SVG': 'Завантажити розгортку SVG',
  'Flat pattern of the openings': 'Розгортка отворів',
  'Print upright with the open top up. Walls under about 1.2 mm may be fragile.': 'Друкуйте вертикально відкритим верхом догори. Стінки тонші за 1,2 мм можуть бути крихкими.',
}

export function tr(lang: Lang, s: string, ...args: (string | number)[]): string {
  const src = lang === 'uk' ? (UK[s] ?? s) : s
  return src.replace(/\{(\d+)\}/g, (_, i: string) => String(args[+i]))
}
