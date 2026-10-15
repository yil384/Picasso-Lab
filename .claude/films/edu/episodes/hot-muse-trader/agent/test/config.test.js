// The broker switch: paper URL wired in, live trading refused whatever the settings, mock without keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, brokerUrl, PAPER_BASE_URL } from '../src/config.js';

test('no keys: the mock', () => {
  const [c, err] = loadConfig({});
  assert.equal(err, null);
  assert.equal(c.alpaca.mock, true);
});

test('paper keys: Alpaca paper, the URL wired in', () => {
  const [c, err] = loadConfig({ ALPACA_KEY_ID: 'PKTEST', ALPACA_SECRET_KEY: 'secret' });
  assert.equal(err, null);
  assert.equal(c.alpaca.mock, false);
  assert.equal(c.alpaca.trading, PAPER_BASE_URL);
  assert.equal(c.alpaca.trading, 'https://paper-api.alpaca.markets');
});

test('live trading is refused', () => {
  for (const u of ['https://api.alpaca.markets', 'https://api.alpaca.markets/', 'https://broker-api.alpaca.markets', 'https://example.com']) {
    const [c, err] = loadConfig({ ALPACA_KEY_ID: 'PKTEST', ALPACA_SECRET_KEY: 's', ALPACA_BASE_URL: u });
    assert.equal(c, null, u);
    assert.match(err, /refused/);
  }
  assert.match(brokerUrl('https://api.alpaca.markets')[1], /never trades real money/);
  assert.match(loadConfig({ ALPACA_KEY_ID: 'AKLIVEKEY', ALPACA_SECRET_KEY: 's' })[1], /live-trading keys/);
  assert.match(loadConfig({ ALPACA_KEY_ID: 'PK1' })[1], /both/);
  assert.equal(brokerUrl('http://127.0.0.1:9999')[0], 'http://127.0.0.1:9999');
  assert.equal(brokerUrl('https://paper-api.alpaca.markets')[0], PAPER_BASE_URL);
});
