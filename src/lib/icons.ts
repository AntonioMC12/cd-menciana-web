export const iconPaths = {
  arrow: 'M3.25 12.75 12.75 3.25M5.25 3.25h7.5v7.5',
  left: 'M13 8H3m5-5L3 8l5 5',
  right: 'M3 8h10M8 3l5 5-5 5',
  up: 'M8 13V3M3 8l5-5 5 5',
  down: 'M8 3v10M3 8l5 5 5-5',
  close: 'M4 4l8 8M12 4l-8 8',
  plus: 'M3 8h10M8 3v10',
  minus: 'M3 8h10',
  'chevron-left': 'M10 3 5 8l5 5',
  'chevron-right': 'M6 3l5 5-5 5',
  'chevron-down': 'M3 5l5 5 5-5',
  image: 'M2 2h12v12H2ZM2 11l4-4 3 3 2-2 3 3M10 5h.01',
} as const;

export function createSvgIcon(name: keyof typeof iconPaths = 'arrow'): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [key, value] of Object.entries({ class: 'arrow-icon', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(key, value);
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', iconPaths[name]); svg.append(path);
  return svg;
}
