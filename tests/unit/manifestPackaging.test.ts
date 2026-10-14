import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Manifest V3 and Build Packaging — Structure, Resource Existence, and Safety Invariants', async (t) => {
  const rootDir = process.cwd();
  const manifestPath = path.resolve(rootDir, 'manifest.json');
  const distDir = path.resolve(rootDir, 'dist');
  const distManifestPath = path.resolve(distDir, 'manifest.json');

  await t.test('Root and dist manifest.json exist and parse as valid JSON', () => {
    assert.ok(fs.existsSync(manifestPath), 'Root manifest.json must exist');
    assert.ok(fs.existsSync(distManifestPath), 'dist/manifest.json must exist');

    const rawRoot = fs.readFileSync(manifestPath, 'utf-8');
    const rootManifest = JSON.parse(rawRoot);
    assert.strictEqual(rootManifest.manifest_version, 3, 'Must be Manifest V3');

    const rawDist = fs.readFileSync(distManifestPath, 'utf-8');
    const distManifest = JSON.parse(rawDist);
    assert.strictEqual(distManifest.manifest_version, 3, 'dist manifest must be Manifest V3');
  });

  await t.test('Permissions are strictly minimal without broad host access or secrets', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    // Verify minimal permissions
    assert.deepStrictEqual(
      manifest.permissions,
      ['activeTab', 'scripting'],
      'Permissions must strictly be activeTab and scripting'
    );
    assert.deepStrictEqual(
      manifest.host_permissions,
      [],
      'host_permissions must be empty'
    );
    assert.strictEqual(
      manifest.permissions.includes('<all_urls>'),
      false,
      'Must NOT request <all_urls> permission'
    );
  });

  await t.test('All manifest-referenced icons exist on disk in both public/ and dist/', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    const iconSizes = ['16', '32', '48', '128'];
    for (const size of iconSizes) {
      const relPath = manifest.icons?.[size];
      assert.ok(relPath, `Icon size ${size} must be defined in manifest.icons`);

      const publicPath = path.resolve(rootDir, 'public', relPath);
      assert.ok(fs.existsSync(publicPath), `Public icon must exist at: ${publicPath}`);

      const distPath = path.resolve(distDir, relPath);
      assert.ok(fs.existsSync(distPath), `Dist icon must exist at: ${distPath}`);

      const stat = fs.statSync(distPath);
      assert.ok(stat.size > 50, `Icon file must be non-empty (got ${stat.size} bytes)`);
    }
  });

  await t.test('Popup entry point exists in dist/ and references built popup.js', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    const popupHtmlRel = manifest.action?.default_popup;
    assert.strictEqual(popupHtmlRel, 'popup.html');

    const distPopupHtml = path.resolve(distDir, popupHtmlRel);
    assert.ok(fs.existsSync(distPopupHtml), `dist/${popupHtmlRel} must exist`);

    const popupHtmlContent = fs.readFileSync(distPopupHtml, 'utf-8');
    assert.ok(
      popupHtmlContent.includes('popup.js'),
      'popup.html must reference the built popup bundle'
    );

    const distPopupJs = path.resolve(distDir, 'assets', 'popup.js');
    assert.ok(fs.existsSync(distPopupJs), 'dist/assets/popup.js must exist');
    assert.ok(fs.statSync(distPopupJs).size > 10000, 'dist/assets/popup.js must be a valid bundle');
  });

  await t.test('Content script entry point exists in dist/ and is valid bundle', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    const contentScripts = manifest.content_scripts;
    assert.ok(Array.isArray(contentScripts) && contentScripts.length > 0);

    const contentJsRel = contentScripts[0].js?.[0];
    assert.strictEqual(contentJsRel, 'assets/content.js');

    const distContentJs = path.resolve(distDir, contentJsRel);
    assert.ok(fs.existsSync(distContentJs), `dist/${contentJsRel} must exist`);
    assert.ok(
      fs.statSync(distContentJs).size > 50000,
      'dist/assets/content.js must be a valid standalone bundle'
    );
  });

  await t.test('Web accessible audio resources are packaged in dist/audio/', () => {
    const distAudioDir = path.resolve(distDir, 'audio');
    assert.ok(fs.existsSync(distAudioDir), 'dist/audio/ directory must exist');

    const languages = ['en', 'hi', 'te'];
    for (const lang of languages) {
      const langDir = path.join(distAudioDir, lang);
      assert.ok(fs.existsSync(langDir), `dist/audio/${lang}/ must exist`);
      const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.mp3'));
      assert.strictEqual(
        files.length,
        20,
        `Expected exactly 20 MP3 files for ${lang}, found ${files.length}`
      );
    }
  });

  await t.test('Packaged build contains zero secrets, .env files, or credential leaks', () => {
    const distFiles = fs.readdirSync(distDir);
    assert.strictEqual(distFiles.includes('.env'), false, 'dist must not contain .env');
    assert.strictEqual(distFiles.includes('.git'), false, 'dist must not contain .git');

    // Verify bundle does not contain obvious secret or API key patterns
    const contentJs = fs.readFileSync(path.resolve(distDir, 'assets', 'content.js'), 'utf-8');
    assert.strictEqual(
      contentJs.includes('sk-ant-'),
      false,
      'Content script must not leak Anthropic API keys'
    );
    assert.strictEqual(
      contentJs.includes('AIzaSy'),
      false,
      'Content script must not leak Google API keys'
    );
  });
});
