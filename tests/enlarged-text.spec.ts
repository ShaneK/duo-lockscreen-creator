import { expect, test, type Page } from '@playwright/test';
import { selectPair } from './helpers';

async function enlargeText(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const elements: Array<HTMLElement | SVGElement> = [];
    function collect(root: Document | ShadowRoot) {
      for (const element of root.querySelectorAll<HTMLElement | SVGElement>('*')) {
        elements.push(element);
        if (element.shadowRoot) collect(element.shadowRoot);
      }
    }
    collect(document);
    const sizes = elements.map(element => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
    for (const { element, size } of sizes) element.style.fontSize = `${size * 2}px`;
  });
}

for (const width of [320, 390]) {
  for (const selected of [false, true]) {
    test(`${selected ? 'selected' : 'empty'} photo labels remain fully visible at 200% text and ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      if (selected) await selectPair(page);
      await enlargeText(page);

      for (const role of ['portrait', 'landscape']) {
        const button = page.getByRole('button', { name: `${selected ? 'Change' : 'Add'} ${role} photo`, exact: true });
        const label = button.getByText(role === 'portrait' ? 'Portrait' : 'Landscape', { exact: true });
        const bounds = await label.evaluate(element => {
          const button = element.closest('button')!;
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            button: button.getBoundingClientRect().toJSON(),
            lines: [...range.getClientRects()].map(rect => rect.toJSON()),
            fontSize: parseFloat(getComputedStyle(element).fontSize),
          };
        });
        expect(bounds.fontSize).toBe(selected ? 28 : 32);
        expect(bounds.lines.length).toBeGreaterThan(0);
        for (const line of bounds.lines) {
          expect.soft(line.left, `${role} label left edge`).toBeGreaterThanOrEqual(bounds.button.left - 0.5);
          expect.soft(line.right, `${role} label right edge`).toBeLessThanOrEqual(bounds.button.right + 0.5);
          expect.soft(line.top, `${role} label top edge`).toBeGreaterThanOrEqual(bounds.button.top - 0.5);
          expect.soft(line.bottom, `${role} label bottom edge`).toBeLessThanOrEqual(bounds.button.bottom + 0.5);
        }
      }
    });
  }
}
