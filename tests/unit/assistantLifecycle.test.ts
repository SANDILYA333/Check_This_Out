import test from 'node:test';
import assert from 'node:assert';
import { MockDocument, MockHTMLElement } from '../mocks/mockDom.ts';
import {
  mountAssistant,
  unmountAssistant,
  isAssistantMounted,
  getActiveController,
  getActiveHighlighter,
  getActiveHost,
  ASSISTANT_HOST_ID,
} from '../../src/content/assistant/lifecycle.ts';

function createSupportedDocument(): MockDocument {
  const doc = new MockDocument();
  doc.body.setAttribute('data-voicecheckout-demo', 'true');
  const total = new MockHTMLElement({
    attributes: { 'data-testid': 'checkout-total' },
  });
  doc.body.appendChild(total);
  return doc;
}

test('Assistant Lifecycle — Mounting, Shadow DOM, and Idempotent Cleanup', async (t) => {
  // Always clean up before and after each test
  unmountAssistant();

  await t.test('Rejects mount on unsupported page', () => {
    const unsupportedDoc = new MockDocument();
    const mounted = mountAssistant(unsupportedDoc as unknown as Document, {
      render: () => ({ unmount: () => {} }),
    });

    assert.strictEqual(mounted, false);
    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(unsupportedDoc.getElementById(ASSISTANT_HOST_ID), null);
  });

  await t.test('Mounts into Shadow DOM on supported page upon explicit invocation', () => {
    const doc = createSupportedDocument();
    let renderCalled = false;

    const mounted = mountAssistant(doc as unknown as Document, {
      render: (container, props) => {
        renderCalled = true;
        assert.ok(container);
        assert.strictEqual(container.id, 'voicecheckout-shadow-container');
        assert.ok(props.controller);
        assert.ok(props.highlighter);
        assert.strictEqual(typeof props.onClose, 'function');
        return { unmount: () => {} };
      },
    });

    assert.strictEqual(mounted, true);
    assert.strictEqual(isAssistantMounted(), true);
    assert.strictEqual(renderCalled, true);

    // Host node in document body
    const host = doc.getElementById(ASSISTANT_HOST_ID);
    assert.ok(host);
    assert.strictEqual(host.id, ASSISTANT_HOST_ID);

    // Shadow DOM attached
    assert.ok(host.shadowRoot);
    assert.strictEqual(host.shadowRoot.host, host);

    // Isolated styles injected into Shadow root
    const styleNode = host.shadowRoot.children.find(
      (c) => c.tagName.toUpperCase() === 'STYLE'
    );
    assert.ok(styleNode);
    assert.ok(styleNode.textContent.includes('.assistant-panel'));

    // React container within Shadow root
    const container = host.shadowRoot.children.find(
      (c) => c.id === 'voicecheckout-shadow-container'
    );
    assert.ok(container);

    // Active controller and highlighter are accessible
    assert.ok(getActiveController());
    assert.ok(getActiveHighlighter());

    // Clean up
    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(isAssistantMounted(), false);
  });

  await t.test('Repeated mount calls do not duplicate host or React tree', () => {
    const doc = createSupportedDocument();
    let renderCount = 0;

    const options = {
      render: () => {
        renderCount++;
        return { unmount: () => {} };
      },
    };

    const firstMount = mountAssistant(doc as unknown as Document, options);
    assert.strictEqual(firstMount, true);
    assert.strictEqual(renderCount, 1);

    // Second call should detect existing mounted assistant
    const secondMount = mountAssistant(doc as unknown as Document, options);
    assert.strictEqual(secondMount, true);
    assert.strictEqual(renderCount, 1); // Not re-rendered or duplicated

    const hosts = doc.querySelectorAll(`#${ASSISTANT_HOST_ID}`);
    assert.strictEqual(hosts.length, 1);

    unmountAssistant(doc as unknown as Document);
  });

  await t.test('Unmount cleans up DOM, observers, and styles completely', () => {
    const doc = createSupportedDocument();
    let unmountCalled = false;

    mountAssistant(doc as unknown as Document, {
      render: () => ({
        unmount: () => {
          unmountCalled = true;
        },
      }),
    });

    assert.strictEqual(isAssistantMounted(), true);

    unmountAssistant(doc as unknown as Document);

    assert.strictEqual(isAssistantMounted(), false);
    assert.strictEqual(unmountCalled, true);
    assert.strictEqual(getActiveController(), null);
    assert.strictEqual(getActiveHighlighter(), null);
    assert.strictEqual(getActiveHost(), null);
    assert.strictEqual(doc.getElementById(ASSISTANT_HOST_ID), null);
  });

  await t.test('Unmount is idempotent and safe to call multiple times', () => {
    const doc = createSupportedDocument();
    mountAssistant(doc as unknown as Document, {
      render: () => ({ unmount: () => {} }),
    });

    assert.doesNotThrow(() => {
      unmountAssistant(doc as unknown as Document);
      unmountAssistant(doc as unknown as Document);
      unmountAssistant(doc as unknown as Document);
    });

    assert.strictEqual(isAssistantMounted(), false);
  });

  await t.test('Reopening sequence (mount -> unmount -> mount) works cleanly', () => {
    const doc = createSupportedDocument();
    let mountCount = 0;
    let unmountCount = 0;

    const options = {
      render: () => {
        mountCount++;
        return {
          unmount: () => {
            unmountCount++;
          },
        };
      },
    };

    // 1. First mount
    assert.strictEqual(mountAssistant(doc as unknown as Document, options), true);
    assert.strictEqual(mountCount, 1);
    assert.strictEqual(isAssistantMounted(), true);

    // 2. Unmount
    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(unmountCount, 1);
    assert.strictEqual(isAssistantMounted(), false);

    // 3. Second mount
    assert.strictEqual(mountAssistant(doc as unknown as Document, options), true);
    assert.strictEqual(mountCount, 2);
    assert.strictEqual(isAssistantMounted(), true);

    // 4. Final unmount
    unmountAssistant(doc as unknown as Document);
    assert.strictEqual(unmountCount, 2);
    assert.strictEqual(isAssistantMounted(), false);
  });
});
