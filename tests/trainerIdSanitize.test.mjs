// Pure-fn unit tests for trainer-ID sanitize helpers.
// Inline-copy the helpers (app.js is `use client` IIFE inside a browser
// bundle and not directly importable from Node). If we ever extract the
// pure logic into a *.pure.js module, these tests can import it directly.
//
// Run: `node --test tests/trainerIdSanitize.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';

const TRAINER_TRAILING_RE = /^([\s\S]*\S)\s+(hk\d{8})\s*$/i;

function splitNameAndTrainerId(raw) {
    const trimmed = (raw == null ? '' : String(raw)).trim();
    if (!trimmed) return { name: '', trainerId: '' };
    if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        return { name: parts[0].trim(), trainerId: (parts[1] || '').trim().toLowerCase() };
    }
    const m = trimmed.match(TRAINER_TRAILING_RE);
    if (m && m[1].trim()) {
        return { name: m[1].trim(), trainerId: m[2].toLowerCase() };
    }
    return { name: trimmed, trainerId: '' };
}

function displayName(p) {
    const raw = p && p.name ? p.name : '';
    if (!raw) return '';
    const m = raw.match(TRAINER_TRAILING_RE);
    return (m && m[1].trim()) ? m[1].trim() : raw;
}

// ── splitNameAndTrainerId ─────────────────────────────────────────────

test('split: empty / whitespace / null returns blank pair', () => {
    assert.deepEqual(splitNameAndTrainerId(''), { name: '', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId('   '), { name: '', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId(null), { name: '', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId(undefined), { name: '', trainerId: '' });
});

test('split: canonical pipe format', () => {
    assert.deepEqual(splitNameAndTrainerId('Alice | hk12345678'),
        { name: 'Alice', trainerId: 'hk12345678' });
    assert.deepEqual(splitNameAndTrainerId('Bob|hk00000001'),
        { name: 'Bob', trainerId: 'hk00000001' });
});

test('split: pipe format with uppercase HK normalises to lowercase', () => {
    assert.deepEqual(splitNameAndTrainerId('Carol | HK87654321'),
        { name: 'Carol', trainerId: 'hk87654321' });
});

test('split: pipe format with only name (empty trainer part)', () => {
    assert.deepEqual(splitNameAndTrainerId('Dan |'),
        { name: 'Dan', trainerId: '' });
});

test('split: fallback paste-without-pipe (space-separated)', () => {
    assert.deepEqual(splitNameAndTrainerId('T hk26417419'),
        { name: 'T', trainerId: 'hk26417419' });
    assert.deepEqual(splitNameAndTrainerId('未知玩乜好 hk69641062'),
        { name: '未知玩乜好', trainerId: 'hk69641062' });
});

test('split: fallback handles multi-word names', () => {
    assert.deepEqual(splitNameAndTrainerId('Hong Kong Card Master hk55556666'),
        { name: 'Hong Kong Card Master', trainerId: 'hk55556666' });
});

test('split: fallback handles invisible Unicode (U+2060 word joiner)', () => {
    assert.deepEqual(splitNameAndTrainerId('⁠wwwwwww hk47876932'),
        { name: '⁠wwwwwww', trainerId: 'hk47876932' });
});

test('split: fallback handles emoji + Chinese names', () => {
    assert.deepEqual(splitNameAndTrainerId('🐢 hk68695056'),
        { name: '🐢', trainerId: 'hk68695056' });
    assert.deepEqual(splitNameAndTrainerId('阿佑 hk98538886'),
        { name: '阿佑', trainerId: 'hk98538886' });
});

test('split: name with no trainer ID at all', () => {
    assert.deepEqual(splitNameAndTrainerId('Eric'),
        { name: 'Eric', trainerId: '' });
});

test('split: name containing "hk" string but not trailing trainer format', () => {
    assert.deepEqual(splitNameAndTrainerId('Hong Kong'),
        { name: 'Hong Kong', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId('hk-master'),
        { name: 'hk-master', trainerId: '' });
});

test('split: trainer ID in middle (NOT trailing) — must not split', () => {
    assert.deepEqual(splitNameAndTrainerId('hk12345678 fan club'),
        { name: 'hk12345678 fan club', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId('User hk12345678 extra'),
        { name: 'User hk12345678 extra', trainerId: '' });
});

test('split: wrong digit count — does not match', () => {
    assert.deepEqual(splitNameAndTrainerId('Joe hk1234567'),    // 7 digits
        { name: 'Joe hk1234567', trainerId: '' });
    assert.deepEqual(splitNameAndTrainerId('Kim hk123456789'),  // 9 digits
        { name: 'Kim hk123456789', trainerId: '' });
});

test('split: pipe takes priority over trailing pattern', () => {
    // If a line happens to be "Foo hk11111111 | hk22222222", pipe wins;
    // organiser explicitly used the canonical separator.
    assert.deepEqual(splitNameAndTrainerId('Foo hk11111111 | hk22222222'),
        { name: 'Foo hk11111111', trainerId: 'hk22222222' });
});

// ── displayName ───────────────────────────────────────────────────────

test('displayName: clean name passes through', () => {
    assert.equal(displayName({ name: 'Alice' }), 'Alice');
    assert.equal(displayName({ name: '阿佑', trainerId: 'hk98538886' }), '阿佑');
});

test('displayName: strips trailing trainer ID from poisoned name', () => {
    assert.equal(displayName({ name: 'T hk26417419' }), 'T');
    assert.equal(displayName({ name: '⁠wwwwwww hk47876932' }), '⁠wwwwwww');
    assert.equal(displayName({ name: '🐢 hk68695056' }), '🐢');
});

test('displayName: empty / null / missing returns empty string', () => {
    assert.equal(displayName(null), '');
    assert.equal(displayName(undefined), '');
    assert.equal(displayName({}), '');
    assert.equal(displayName({ name: '' }), '');
});

test('displayName: does not strip if hk is in middle', () => {
    assert.equal(displayName({ name: 'hk-master' }), 'hk-master');
    assert.equal(displayName({ name: 'User hk12345678 fan' }), 'User hk12345678 fan');
});

test('displayName: case insensitive on hk prefix', () => {
    assert.equal(displayName({ name: 'Sam HK12345678' }), 'Sam');
    assert.equal(displayName({ name: 'Sam Hk12345678' }), 'Sam');
});
