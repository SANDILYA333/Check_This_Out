import test from 'node:test';
import assert from 'node:assert';
import {
  getStageInfo,
  STAGE_DETAILS,
  UPI_PIN_SAFETY_WARNING,
} from '../../src/content/assistant/instructions.ts';
import type { CheckoutStage, Language } from '../../src/guidance/types.ts';

test('Assistant Instructions — Stage Details and PIN Warning', async (t) => {
  const allStages: CheckoutStage[] = [
    'WELCOME',
    'LANGUAGE',
    'ADDRESS',
    'ADDRESS_CHANGE_STUB',
    'METHOD',
    'REVIEW',
    'UPI_SIMULATION',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'PENDING',
    'UNSUPPORTED',
  ];

  const allLangs: Language[] = ['en', 'te', 'hi'];

  await t.test('All canonical stages have valid instructions in en, te, and hi', () => {
    for (const stage of allStages) {
      for (const lang of allLangs) {
        const info = getStageInfo(stage, lang);
        assert.ok(info, `StageInfo should exist for ${stage}:${lang}`);
        assert.ok(
          info.title && info.title.trim().length > 0,
          `Title should not be empty for ${stage}:${lang}`
        );
        assert.ok(
          info.instruction && info.instruction.trim().length > 0,
          `Instruction should not be empty for ${stage}:${lang}`
        );
      }
    }
  });

  await t.test('UPI_SIMULATION stage includes prominent PIN safety warning across all languages', () => {
    assert.strictEqual(UPI_PIN_SAFETY_WARNING, 'Never tell anyone your PIN.');

    for (const lang of allLangs) {
      const info = getStageInfo('UPI_SIMULATION', lang);
      assert.strictEqual(info.pinWarning, true);
    }
  });

  await t.test('Step numbers exist on core checkout stages (ADDRESS, METHOD, REVIEW, UPI_SIMULATION)', () => {
    const address = getStageInfo('ADDRESS', 'en');
    assert.strictEqual(address.stepNumber, 1);
    assert.strictEqual(address.totalSteps, 4);

    const method = getStageInfo('METHOD', 'en');
    assert.strictEqual(method.stepNumber, 2);
    assert.strictEqual(method.totalSteps, 4);

    const review = getStageInfo('REVIEW', 'en');
    assert.strictEqual(review.stepNumber, 3);
    assert.strictEqual(review.totalSteps, 4);

    const upi = getStageInfo('UPI_SIMULATION', 'en');
    assert.strictEqual(upi.stepNumber, 4);
    assert.strictEqual(upi.totalSteps, 4);
  });
});
