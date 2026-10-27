import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterFeedback } from './character-state.js';

describe('Character Emotion & Speech Bubble State Machine Suite', () => {
  it('returns FELIZ on idle home screen with welcoming speech bubble', () => {
    const feedback = getCharacterFeedback('home', 'IDLE', false, false, false);
    assert.equal(feedback.mood, 'FELIZ');
    assert.equal(feedback.imageSrc, '/assets/character/Feliz.png');
    assert.ok(feedback.bubble);
    assert.equal(feedback.bubble?.text, 'Estoy aquí para acompañarte');
  });

  it('returns DUDOSO when user is holding SOS button in preparation', () => {
    const feedback = getCharacterFeedback('home', 'PREPARING', false, false, false);
    assert.equal(feedback.mood, 'DUDOSO');
    assert.equal(feedback.imageSrc, '/assets/character/dudoso.png');
    assert.ok(feedback.bubble);
    assert.equal(feedback.bubble?.text, 'Sigue presionando');
  });

  it('returns TRANQUILO when emergency preparation is cancelled', () => {
    const feedback = getCharacterFeedback('home', 'IDLE', false, false, true);
    assert.equal(feedback.mood, 'TRANQUILO');
    assert.equal(feedback.imageSrc, '/assets/character/tranquilo.png');
    assert.ok(feedback.bubble);
    assert.equal(feedback.bubble?.text, 'Alerta cancelada');
  });

  it('returns ENOJADO with processing bubble while waiting backend activation', () => {
    const feedback = getCharacterFeedback('home', 'ACTIVATING', true, false, false);
    assert.equal(feedback.mood, 'ENOJADO');
    assert.equal(feedback.imageSrc, '/assets/character/enojado.png');
    assert.ok(feedback.bubble);
    assert.equal(feedback.bubble?.text, 'Activando alerta...');
  });

  it('returns ENOJADO with confirmed alert bubble once emergency is active', () => {
    const feedback = getCharacterFeedback('active_sos', 'ACTIVE', false, true, false);
    assert.equal(feedback.mood, 'ENOJADO');
    assert.equal(feedback.imageSrc, '/assets/character/enojado.png');
    assert.ok(feedback.bubble);
    assert.equal(feedback.bubble?.text, 'Alerta activada');
  });
});
