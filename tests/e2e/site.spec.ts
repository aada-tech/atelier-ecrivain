import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test.describe('landing', () => {
  test('se charge sans erreur et mène à la connexion', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Parlez. Votre livre s’écrit.' })).toBeVisible();
    await expect(page.locator('[data-scene]').first()).toBeAttached();
    // Parcourt la page pour déclencher toutes les animations au défilement.
    for (let y = 0; y < 12; y++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(120);
    }
    await expect(page.locator('#faq')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('la FAQ se déplie au clavier', async ({ page }) => {
    await page.goto('/#faq');
    const first = page
      .locator('#faq [data-state]')
      .filter({ has: page.locator('button') })
      .first()
      .locator('button');
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  test('respecte prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
});

test.describe('pages publiques', () => {
  for (const [path, title] of [
    ['/confidentialite', /confidentialité/i],
    ['/mentions-legales', /mentions légales/i],
    ['/conditions', /conditions/i],
  ] as const) {
    test(`${path} est lisible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    });
  }

  test('le studio de reels affiche les cinq formats @desktop', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/reels');
    await expect(page.getByRole('heading', { name: 'Studio vidéo' })).toBeVisible();
    for (const label of ['Dicter', 'Raturer', 'Vérifier', 'Composer', 'Relire']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await page.getByRole('button', { name: /^Vérifier/ }).click();
    await expect(page.getByRole('button', { name: /^Vérifier/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: /mode capture/i })).toHaveAttribute('href', '/reels?capture=1&reel=faits');
    await page.goto('/reels?capture=1&reel=ratures');
    await expect(page.locator('[data-capture-ready]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('404 personnalisée', async ({ page }) => {
    const res = await page.goto('/nulle-part');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page raturée.' })).toBeVisible();
  });

  test('robots, sitemap et manifeste', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /atelier');
    expect((await request.get('/sitemap.xml')).ok()).toBe(true);
    expect((await request.get('/manifest.webmanifest')).ok()).toBe(true);
  });
});

test.describe('sécurité', () => {
  test('en-têtes de sécurité', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['permissions-policy']).toContain('microphone=(self)');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('les routes IA exigent une session', async ({ request }) => {
    for (const route of ['analyze', 'factcheck', 'research', 'cover', 'transcribe']) {
      const res = await request.post(`/api/ai/${route}`, { data: { text: 'Bonjour' } });
      expect(res.status(), route).toBe(401);
      expect(res.headers()['cache-control']).toContain('no-store');
      expect((await res.json()).error.code).toBe('unauthenticated');
    }
  });

  test('les routes IA refusent une autre origine', async ({ request }) => {
    const res = await request.post('/api/ai/analyze', {
      data: { text: 'Bonjour' },
      headers: { origin: 'https://evil.example', authorization: 'Bearer x' },
    });
    expect(res.status()).toBe(403);
  });

  test('les pages de l’application ne sont pas indexées', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
