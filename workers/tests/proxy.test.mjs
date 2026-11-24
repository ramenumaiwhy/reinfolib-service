import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.ts';

test('キー付きの国交省リクエストは転送を追わず、3xxを502として返す', async t => {
  for (const endpoint of ['XIT001', 'XIT002']) {
    const upstream = t.mock.method(globalThis, 'fetch', async (input, options) => {
      assert.equal(input, 'https://www.reinfolib.mlit.go.jp/ex-api/external/' + endpoint);
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers['Ocp-Apim-Subscription-Key'], 'fixture');
      return new Response(null, { status: 307, headers: { Location: '/moved' } });
    });
    const response = await app.request('/api/' + endpoint, {
      headers: { 'Ocp-Apim-Subscription-Key': 'fixture' },
    });
    assert.equal(upstream.mock.callCount(), 1);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Location'), null);
    upstream.mock.restore();
  }
});
