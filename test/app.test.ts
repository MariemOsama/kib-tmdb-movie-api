import test from 'node:test';
import assert from 'node:assert/strict';
import { AppController } from '../src/app.controller.js';

void test('welcome returns helpful root response', () => {
  const controller = new AppController();

  assert.deepEqual(controller.welcome(), {
    name: 'KIB TMDB Movie API',
    status: 'running',
    docs: '/docs',
    health: '/health',
    ready: '/ready',
  });
});
