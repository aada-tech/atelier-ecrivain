#!/usr/bin/env node
/**
 * Enregistre chaque reel de /reels en vidéo verticale 1080×1920 (WebM),
 * prête pour TikTok, Instagram Reels et YouTube Shorts.
 *
 * Prérequis : l'application tourne (npm run build && npm start).
 * Usage     : npm run reels:record [-- --base=http://localhost:3000 --seconds=16 --only=dictee]
 * Sortie    : reels-output/<reel>.webm (et .mp4 si ffmpeg est installé).
 */
import { chromium } from '@playwright/test';
import { mkdir, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const BASE = args.base ?? process.env.BASE_URL ?? 'http://localhost:3000';
const SECONDS = Number(args.seconds ?? 16);
const REELS = (args.only ?? 'dictee,ratures,faits,livre,liseuse').split(',');
const OUT = join(process.cwd(), 'reels-output');
const TMP = join(OUT, '.tmp');

// Chromium fourni par Playwright, ou un binaire explicite (CHROMIUM_PATH).
const executablePath = process.env.CHROMIUM_PATH;

await mkdir(TMP, { recursive: true });
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

for (const id of REELS) {
  // Fenêtre 1080×1920 : la scène (conçue en 360×640) est agrandie ×3 en vectoriel, donc nette.
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: 1080, height: 1920 } },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/reels?capture=1&reel=${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-capture-ready]');
  await page.waitForTimeout(SECONDS * 1000);
  const video = page.video();
  await context.close();
  const file = join(OUT, `${id}.webm`);
  await rename(await video.path(), file);
  console.log(`✓ ${file}`);
  if (hasFfmpeg) {
    const mp4 = join(OUT, `${id}.mp4`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '30', mp4]);
    console.log(`✓ ${mp4}`);
  }
}

await browser.close();
await rm(TMP, { recursive: true, force: true });
console.log(hasFfmpeg ? 'Terminé.' : 'Terminé (installez ffmpeg pour obtenir aussi des .mp4).');
