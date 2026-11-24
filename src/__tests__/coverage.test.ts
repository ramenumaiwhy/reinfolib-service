/// <reference types="vite/client" />
import page from '../../docs/app.html?raw';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('検索年度を404、空の応答、地区の集計に採用した件数に分ける', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01'));
  const template = document.createElement('template');
  template.innerHTML = page;
  template.content.querySelectorAll('link, script').forEach(el => el.remove());
  document.body.replaceChildren(template.content);
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: storage.get.bind(storage), setItem: storage.set.bind(storage) });
  const sale = {
    Municipality: '渋谷区', Prefecture: '東京都', DistrictName: '恵比寿',
    Area: '100', TradePrice: '50000000', Type: '宅地(土地のみ)',
  };
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes('AddressSearch')) return Response.json([{ geometry: { coordinates: [139.71, 35.65] } }]);
    if (url.includes('LonLatToAddress')) return Response.json({ results: { muniCd: '13113', lv01Nm: '恵比寿一丁目' } });
    expect(url).toMatch(/^\/api\/XIT00[12]\?/);
    expect(options?.redirect).toBe('error');
    if (url.includes('XIT002')) return Response.json({ data: [{ id: '13113', name: '渋谷区' }] });
    if (url.includes('year=2026')) return new Response(null, { status: 404 });
    if (url.includes('year=2025')) return Response.json({ data: [] });
    return Response.json({ data: [sale, { ...sale, DistrictName: '別地区' }] });
  });
  vi.stubGlobal('fetch', fetchMock);
  await import('../app');
  document.querySelector<HTMLInputElement>('#apiKeyInput')!.value = 'fixture';
  document.querySelector<HTMLButtonElement>('#saveKeyBtn')!.click();
  await vi.runAllTimersAsync();
  expect(storage.get('reinfolib_api_key')).toBe('fixture');
  document.querySelector<HTMLInputElement>('#addressInput')!.value = '渋谷区恵比寿';
  document.querySelector<HTMLButtonElement>('#analyzeBtn')!.click();
  await vi.runAllTimersAsync();
  const summary = document.querySelector('#resultSummary')!.textContent;
  expect(summary).toContain('2026年 未取得（404）');
  expect(summary).toContain('2025年 市区町村の取引0件');
  expect(summary).toContain('2024年 土地のみ1件・建物込み0件');
});
