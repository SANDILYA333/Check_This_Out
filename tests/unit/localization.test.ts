import test from 'node:test';
import assert from 'node:assert';
import {
  CANONICAL_MESSAGE_KEYS,
  DICTIONARIES,
  getDictionary,
  getMessage,
  STAGE_MESSAGE_MAP,
  getStageMessageMapping,
  type Language,
  type MessageKey,
} from '../../src/localization/index.ts';
import type { CheckoutStage } from '../../src/guidance/types.ts';

test('Localization Module — Canonical Keys, Completeness, and Alignment', async (t) => {
  const supportedLanguages: readonly Language[] = ['en', 'hi', 'te'] as const;

  await t.test('All three required languages (en, hi, te) have complete dictionaries', () => {
    for (const lang of supportedLanguages) {
      const dict = getDictionary(lang);
      assert.ok(dict, `Dictionary for language "${lang}" should exist`);

      for (const key of CANONICAL_MESSAGE_KEYS) {
        assert.ok(
          key in dict,
          `Key "${key}" must exist in "${lang}" dictionary`
        );
        const val = dict[key];
        assert.strictEqual(
          typeof val,
          'string',
          `Value for "${key}" in "${lang}" must be a string`
        );
        assert.ok(
          val.trim().length > 0,
          `Value for "${key}" in "${lang}" must not be empty`
        );
      }
    }
  });

  await t.test('Fixed spoken price wording for ₹1,499 is consistent and aligned', () => {
    // English
    const enPrice = getMessage('en', 'order_total_spoken');
    assert.ok(
      enPrice.includes('one thousand four hundred ninety-nine rupees'),
      `English spoken price must express 1,499 rupees: got "${enPrice}"`
    );

    // Telugu
    const tePrice = getMessage('te', 'order_total_spoken');
    assert.ok(
      tePrice.includes('వెయ్యి నాలుగు వందల తొంభై తొమ్మిది రూపాయలు'),
      `Telugu spoken price must express 1,499 rupees: got "${tePrice}"`
    );

    // Hindi
    const hiPrice = getMessage('hi', 'order_total_spoken');
    assert.ok(
      hiPrice.includes('एक हज़ार चार सौ निन्यानवे रुपये'),
      `Hindi spoken price must express 1,499 rupees: got "${hiPrice}"`
    );

    // Fixed visible amount ₹1,499 remains constant across all dictionaries
    for (const lang of supportedLanguages) {
      assert.strictEqual(getMessage(lang, 'order_total_value'), '₹1,499');
    }
  });

  await t.test('Mandatory UPI PIN safety warning is aligned and exact in English', () => {
    assert.strictEqual(
      getMessage('en', 'upi_safety_warning'),
      'Never tell anyone your PIN.'
    );
    assert.strictEqual(
      getMessage('te', 'upi_safety_warning'),
      'మీ పిన్ ఎవరికీ చెప్పవద్దు.'
    );
    assert.strictEqual(
      getMessage('hi', 'upi_safety_warning'),
      'अपना पिन कभी किसी को न बताएं।'
    );
  });

  await t.test('All canonical CheckoutStages map to valid MessageKeys and instructions', () => {
    const canonicalStages: readonly CheckoutStage[] = [
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

    for (const stage of canonicalStages) {
      const mapping = getStageMessageMapping(stage);
      assert.ok(mapping, `Mapping for stage "${stage}" must exist`);
      assert.ok(
        CANONICAL_MESSAGE_KEYS.includes(mapping.titleKey),
        `titleKey "${mapping.titleKey}" for "${stage}" must be canonical`
      );
      assert.ok(
        CANONICAL_MESSAGE_KEYS.includes(mapping.instructionKey),
        `instructionKey "${mapping.instructionKey}" for "${stage}" must be canonical`
      );

      // Verify each language returns non-empty strings for both title and instruction
      for (const lang of supportedLanguages) {
        const title = getMessage(lang, mapping.titleKey);
        const instruction = getMessage(lang, mapping.instructionKey);
        assert.ok(title.length > 0, `Title for ${stage}:${lang} must not be empty`);
        assert.ok(instruction.length > 0, `Instruction for ${stage}:${lang} must not be empty`);
      }
    }

    // Only UPI_SIMULATION stage must have hasPinWarning = true
    assert.strictEqual(STAGE_MESSAGE_MAP.UPI_SIMULATION.hasPinWarning, true);
    assert.strictEqual(STAGE_MESSAGE_MAP.REVIEW.hasPinWarning, false);
    assert.strictEqual(STAGE_MESSAGE_MAP.ADDRESS.hasPinWarning, false);
  });

  await t.test('Language names are available for preview in each language script', () => {
    assert.strictEqual(getMessage('te', 'lang_name_te'), 'తెలుగు');
    assert.strictEqual(getMessage('hi', 'lang_name_hi'), 'हिन्दी');
    assert.strictEqual(getMessage('en', 'lang_name_en'), 'English');
  });
});
