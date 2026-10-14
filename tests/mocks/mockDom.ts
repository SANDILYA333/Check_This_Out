export class MockCSSStyleDeclaration {
  private properties: Map<string, { value: string; priority: string }> = new Map();

  getPropertyValue(prop: string): string {
    return this.properties.get(prop)?.value ?? '';
  }

  getPropertyPriority(prop: string): string {
    return this.properties.get(prop)?.priority ?? '';
  }

  setProperty(prop: string, value: string, priority: string = ''): void {
    this.properties.set(prop, { value, priority });
  }

  removeProperty(prop: string): string {
    const val = this.getPropertyValue(prop);
    this.properties.delete(prop);
    return val;
  }

  get display(): string {
    return this.getPropertyValue('display');
  }
  set display(val: string) {
    this.setProperty('display', val);
  }

  get visibility(): string {
    return this.getPropertyValue('visibility');
  }
  set visibility(val: string) {
    this.setProperty('visibility', val);
  }

  get opacity(): string {
    return this.getPropertyValue('opacity');
  }
  set opacity(val: string) {
    this.setProperty('opacity', val);
  }
}

export interface MockElementInit {
  tagName?: string;
  id?: string;
  attributes?: Record<string, string>;
  style?: { display?: string; visibility?: string; opacity?: string; outline?: string };
  disabled?: boolean;
  isConnected?: boolean;
  textContent?: string;
}

export class MockHTMLElement {
  public tagName: string;
  public id: string = '';
  public nodeType: number = 1;
  public ownerDocument: MockDocument | null = null;
  public attributes: Map<string, string> = new Map();
  public style: MockCSSStyleDeclaration = new MockCSSStyleDeclaration();
  public disabled: boolean = false;
  public isConnected: boolean = true;
  private explicitlyDisconnected: boolean = false;
  public textContent: string = '';
  public children: MockHTMLElement[] = [];
  public parentNode: MockHTMLElement | null = null;
  public clickedCount: number = 0;
  public shadowRoot: MockShadowRoot | null = null;
  private listeners: Map<string, Set<(e: any) => void>> = new Map();

  constructor(init: MockElementInit = {}) {
    this.tagName = (init.tagName || 'DIV').toUpperCase();
    this.id = init.id || '';
    if (init.id) {
      this.attributes.set('id', init.id);
    }
    this.disabled = init.disabled ?? false;
    this.isConnected = init.isConnected ?? true;
    if (init.isConnected === false) {
      this.explicitlyDisconnected = true;
    }
    this.textContent = init.textContent ?? '';

    if (init.style) {
      for (const [k, v] of Object.entries(init.style)) {
        if (v !== undefined) this.style.setProperty(k, v);
      }
    }

    if (init.attributes) {
      for (const [k, v] of Object.entries(init.attributes)) {
        this.attributes.set(k, v);
      }
    }
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name === 'id') this.id = '';
  }

  click(): void {
    this.clickedCount += 1;
    this.dispatchEvent({ type: 'click', target: this } as unknown as MouseEvent);
  }

  matches(selector: string): boolean {
    if (selector.startsWith('#')) {
      return this.id === selector.substring(1);
    }

    // Support tag prefix and operators, e.g. input[name="foo"] or form[action*="validateCaptcha"]
    const tagAttrMatch = selector.match(/^([a-zA-Z0-9_-]+)?\[([^=*^$\]]+)([*^$]?=)"?([^"\]]*)"?\]$/);
    if (tagAttrMatch) {
      const [, tag, attr, op, val] = tagAttrMatch;
      if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) {
        return false;
      }
      const actualVal = this.attributes.get(attr);
      if (actualVal === undefined) return false;
      if (op === '=') return actualVal === val;
      if (op === '*=') return actualVal.includes(val);
      if (op === '^=') return actualVal.startsWith(val);
      if (op === '$=') return actualVal.endsWith(val);
      return false;
    }

    const tagAttrOnly = selector.match(/^([a-zA-Z0-9_-]+)?\[([^\]]+)\]$/);
    if (tagAttrOnly) {
      const [, tag, attr] = tagAttrOnly;
      if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) {
        return false;
      }
      return this.attributes.has(attr);
    }

    const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
    if (classMatch) {
      const className = this.attributes.get('class') || '';
      return className.split(/\s+/).includes(classMatch[1]);
    }

    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  closest(selector: string): MockHTMLElement | null {
    let curr: MockHTMLElement | null = this;
    while (curr) {
      if (curr.matches(selector)) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  querySelector<E extends Element = Element>(selector: string): E | null {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child as unknown as E;
      }
      const found = child.querySelector<E>(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    const results: MockHTMLElement[] = [];

    const traverse = (node: MockHTMLElement) => {
      for (const child of node.children) {
        if (child.matches(selector)) {
          results.push(child);
        }
        traverse(child);
      }
    };

    traverse(this);
    return results as unknown as NodeListOf<E>;
  }

  appendChild(child: MockHTMLElement): void {
    child.parentNode = this;
    if (!child.explicitlyDisconnected) {
      child.isConnected = this.isConnected;
    }
    this.children.push(child);
  }

  remove(): void {
    this.isConnected = false;
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) {
        this.parentNode.children.splice(idx, 1);
      }
      this.parentNode = null;
    }
  }

  attachShadow(_init: { mode: 'open' | 'closed' }): MockShadowRoot {
    this.shadowRoot = new MockShadowRoot(this);
    return this.shadowRoot;
  }

  addEventListener(type: string, listener: (e: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: any): boolean {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of set) {
        fn(event);
      }
    }
    return true;
  }
}

export class MockShadowRoot extends MockHTMLElement {
  public host: MockHTMLElement;

  constructor(host: MockHTMLElement) {
    super({ tagName: 'SHADOW-ROOT' });
    this.host = host;
  }
}

export class MockDocument {
  public nodeType: number = 9;
  public body: MockHTMLElement;
  private docListeners: Map<string, Set<(e: any) => void>> = new Map();

  constructor() {
    this.body = new MockHTMLElement({ tagName: 'BODY' });
    this.body.ownerDocument = this;
  }

  createElement(tagName: string): MockHTMLElement {
    const el = new MockHTMLElement({ tagName });
    el.ownerDocument = this;
    return el;
  }

  getElementById(id: string): MockHTMLElement | null {
    if (this.body.id === id) return this.body;
    return this.body.querySelector(`#${id}`);
  }

  querySelector<E extends Element = Element>(selector: string): E | null {
    if (this.body.matches(selector)) {
      return this.body as unknown as E;
    }
    return this.body.querySelector<E>(selector);
  }

  querySelectorAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    const list: MockHTMLElement[] = [];
    if (this.body.matches(selector)) {
      list.push(this.body);
    }
    const childrenList = this.body.querySelectorAll<E>(selector);
    for (let i = 0; i < childrenList.length; i++) {
      list.push(childrenList[i] as unknown as MockHTMLElement);
    }
    return list as unknown as NodeListOf<E>;
  }

  addEventListener(type: string, listener: (e: any) => void, _useCapture?: boolean): void {
    if (!this.docListeners.has(type)) {
      this.docListeners.set(type, new Set());
    }
    this.docListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void, _useCapture?: boolean): void {
    this.docListeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: any): boolean {
    const set = this.docListeners.get(event.type);
    if (set) {
      for (const fn of set) {
        fn(event);
      }
    }
    return true;
  }
}
