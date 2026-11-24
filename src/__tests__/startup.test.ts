/// <reference types="vite/client" />
import page from '../../docs/app.html?raw';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('配信用HTMLで初期化し、APIキー未入力を画面に表示する', async () => {
  const template = document.createElement('template');
  template.innerHTML = page;
  template.content.querySelectorAll('link, script').forEach(el => el.remove());
  document.body.replaceChildren(template.content);
  vi.stubGlobal('localStorage', { getItem: () => null });
  await import('../app');

  document.querySelector<HTMLButtonElement>('#saveKeyBtn')!.click();
  expect(document.querySelector('#apiKeyStatus')?.textContent).toBe('APIキーを入力してください');
});
