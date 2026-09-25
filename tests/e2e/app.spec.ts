import { expect, test } from '@playwright/test';

/**
 * Parcours complet de l'application contre les émulateurs Firebase
 * (construit avec NEXT_PUBLIC_USE_EMULATORS=1) : `npm run test:e2e:emulators`.
 */
test.skip(process.env.E2E_EMULATORS !== '1', 'Nécessite les émulateurs Firebase (npm run test:e2e:emulators).');
test.describe.configure({ mode: 'serial' });

test('écrire, annoter, retrouver son texte @desktop', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Essayer sans compte' }).click();
  await page.waitForURL('**/bibliotheque');

  await page
    .getByRole('button', { name: /Nouveau manuscrit/ })
    .first()
    .click();
  await page.getByLabel(/Titre \(provisoire/).fill('Le Phare');
  await page.getByRole('button', { name: 'Créer et écrire' }).click();
  await page.waitForURL('**/atelier?m=*');

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type('Elle dit "bonjour" et partit... Le phare veillait.');
  // Typographie française appliquée à la frappe.
  await expect(editor).toContainText('« bonjour »');
  await expect(editor).toContainText('partit…');

  // Note de bas de page depuis la palette de commandes.
  await page.keyboard.press('Control+k');
  await page.keyboard.type('note de bas');
  await page.keyboard.press('Enter');
  const note = page.getByLabel('Note 1');
  await note.fill('Le phare de Cordouan.');
  await expect(note).toBeFocused();
  await page.waitForTimeout(1_000);
  await note.pressSequentially(' Roi des phares.', { delay: 40 });
  // La saisie ne doit jamais perdre le focus pendant les sauvegardes.
  await expect(note).toBeFocused();
  await expect(note).toHaveValue('Le phare de Cordouan. Roi des phares.');

  // Version figée.
  await page.getByRole('tab', { name: /Versions/ }).click();
  await page.getByLabel('Nom de la version').fill('Premier jet');
  await page.getByRole('button', { name: /Figer/ }).click();
  await expect(page.getByText('Premier jet')).toBeVisible();

  await expect(page.getByText(/Enregistré/).first()).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator('.ProseMirror')).toContainText('Le phare veillait.');
  await expect(page.locator('.ProseMirror sup.note-ref')).toHaveCount(1);

  // Exports : le moteur PDF compile du WebAssembly, que la CSP doit autoriser.
  await page
    .getByRole('button', { name: /Exporter/ })
    .first()
    .click();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Générer le PDF' }).click()]);
  expect(pdf.suggestedFilename()).toBe('le-phare.pdf');
  await page.getByRole('button', { name: 'Liseuse EPUB' }).click();
  const [epub] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Générer l’EPUB' }).click()]);
  expect(epub.suggestedFilename()).toBe('le-phare.epub');
  await page.keyboard.press('Escape');

  // Liseuse.
  const mid = new URL(page.url()).searchParams.get('m');
  await page.goto(`/liseuse?m=${mid}`);
  await expect(page.getByText('Le phare veillait.')).toBeVisible();

  expect(errors).toEqual([]);
});
