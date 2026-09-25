import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-atelier',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();

const chapter = {
  title: 'Chapitre 1',
  order: 0,
  status: 'draft',
  doc: { type: 'doc', content: [] },
  notes: [],
  suggestions: [],
  wordCount: 0,
  schema: 2,
};

describe('cloisonnement', () => {
  it('un utilisateur écrit et lit ses propres manuscrits', async () => {
    await assertSucceeds(
      setDoc(doc(alice(), 'users/alice/manuscripts/m1'), {
        title: 'Le Phare',
        wordCount: 0,
        chapterCount: 1,
        schema: 2,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/manuscripts/m1')));
  });
  it('personne ne lit ni n’écrit chez un autre', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'users/alice/manuscripts/m1'), { title: 'Secret' }));
    await assertFails(getDoc(doc(bob(), 'users/alice/manuscripts/m1')));
    await assertFails(setDoc(doc(bob(), 'users/alice/manuscripts/m2'), { title: 'Intrus' }));
    await assertFails(getDoc(doc(anon(), 'users/alice/manuscripts/m1')));
  });
  it('les anciens compteurs partagés system/quotas sont fermés', async () => {
    await assertFails(setDoc(doc(alice(), 'system/quotas'), { dayCount: increment(1) }));
    await assertFails(getDoc(doc(alice(), 'system/quotas')));
  });
});

describe('validation', () => {
  it('refuse un champ inconnu sur un manuscrit', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/manuscripts/m1'), { title: 'x', isAdmin: true }));
  });
  it('refuse un titre de chapitre trop long ou un statut invalide', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/manuscripts/m1/chapters/c1'), { ...chapter, title: 'x'.repeat(301) }));
    await assertFails(setDoc(doc(alice(), 'users/alice/manuscripts/m1/chapters/c1'), { ...chapter, status: 'publié' }));
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/manuscripts/m1/chapters/c1'), chapter));
  });
  it('tolère les champs v1 d’un chapitre non encore migré', async () => {
    await assertSucceeds(
      setDoc(doc(alice(), 'users/alice/manuscripts/m1/chapters/ch-1'), {
        title: 'Ancien',
        order: 0,
        paragraphs: ['a'],
        blocks: [],
        pendingReviews: [],
      }),
    );
  });
  it('n’accepte qu’une image data: pour la couverture', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/manuscripts/m1/meta/cover'), { dataUrl: 'javascript:alert(1)' }));
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/manuscripts/m1/meta/cover'), { dataUrl: 'data:image/jpeg;base64,AAAA' }));
    await assertFails(setDoc(doc(alice(), 'users/alice/manuscripts/m1/meta/autre'), { x: 1 }));
  });
  it('rend les versions immuables', async () => {
    const ref = doc(alice(), 'users/alice/manuscripts/m1/snapshots/v1');
    await assertSucceeds(
      setDoc(ref, { chapterId: 'c1', title: 'T', label: 'L', doc: {}, notes: [], wordCount: 3, auto: false, createdAt: serverTimestamp() }),
    );
    await assertFails(setDoc(ref, { chapterId: 'c1', title: 'Modifié' }));
    await assertSucceeds(deleteDoc(ref));
  });
  it('valide le profil et le moteur de dictée', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/profile/info'), { penName: 'Camille', dailyGoal: 500, dictationEngine: 'auto' }));
    await assertFails(setDoc(doc(alice(), 'users/alice/profile/info'), { dictationEngine: 'autre' }));
    await assertFails(setDoc(doc(alice(), 'users/alice/profile/autre'), { penName: 'x' }));
  });
  it('limite les statistiques à des jours et des nombres positifs', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/stats/2026-09-25'), { words: increment(120), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(alice(), 'users/alice/stats/hier'), { words: 1 }));
    await assertFails(setDoc(doc(alice(), 'users/alice/stats/2026-09-25'), { words: -5 }));
  });
});
