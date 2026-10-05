/* What scripts/verify-simple-view.mjs and scripts/mobile-gate.mjs check on this product. The
 * site has no API routes and writes nothing, so nothing needs mocking. */
export default {
  product: 'compound-evals',
  base: 'http://localhost:3303',
  routes: ['/environments', '/agentwire', '/breachprobe'],
  mocks: [],
  async action({ page, check, settle, shot }) {
    await page.locator('#start .sv-select-btn').click();
    await page.waitForTimeout(300);
    await shot(page, 'simple-select-open-1440', { fullPage: false });
    await page.locator('#start [role=option]', { hasText: 'breachprobe' }).click();
    await page.locator('.sv-tools button', { hasText: 'Console' }).click();
    await settle(page);
    await page.locator('.sv-tools button', { hasText: 'Simple' }).click();
    await settle(page);
    check((await page.locator('#start .sv-select-val').textContent()).startsWith('breachprobe'), 'the picked environment survives a switch both ways');
    await page.locator('#start .sv-primary').click();
    await page.waitForURL(/\/breachprobe$/);
    await settle(page);
    check(await page.locator('.sv-task').count() > 0, 'the picker opens the environment with its tasks');
  },
};
