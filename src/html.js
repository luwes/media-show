import {
  TemplateInstance,
  NodeTemplatePart,
  createProcessor,
  AttributeTemplatePart,
} from '/node_modules/@github/template-parts/lib/index.js';

export function css(strings, ...values) {
  return values.reduce((finalString, value, index) => {
    return `${finalString}${value}${strings[index + 1]}`;
  }, strings[0]);
}

// NOTE: These are either direct ports or significantly based off of github's jtml template part processing logic. For more, see: https://github.com/github/jtml

const eventListeners = new WeakMap();
class EventHandler {
  constructor(element, type) {
    this.element = element;
    this.type = type;
    this.element.addEventListener(this.type, this);
    const elementMap = eventListeners.get(this.element);
    if (elementMap) {
      elementMap.set(this.type, this);
    }
  }
  set(listener) {
    if (typeof listener == 'function') {
      this.handleEvent = listener.bind(this.element);
    } else if (
      typeof listener === 'object' &&
      typeof listener.handleEvent === 'function'
    ) {
      this.handleEvent = listener.handleEvent.bind(listener);
    } else {
      this.element.removeEventListener(this.type, this);
      const elementMap = eventListeners.get(this.element);
      if (elementMap) {
        elementMap.delete(this.type);
      }
    }
  }
  static for(part) {
    if (!eventListeners.has(part.element))
      eventListeners.set(part.element, new Map());
    const type = part.attributeName.slice(2);
    const elementListeners = eventListeners.get(part.element);
    if (elementListeners && elementListeners.has(type))
      return elementListeners.get(type);
    return new EventHandler(part.element, type);
  }
}

export function processEvent(part, value) {
  if (
    part instanceof AttributeTemplatePart &&
    part.attributeName.startsWith('on')
  ) {
    EventHandler.for(part).set(value);
    part.element.removeAttributeNS(part.attributeNamespace, part.attributeName);
    return true;
  }
  return false;
}

function processSubTemplate(part, value) {
  if (value instanceof TemplateResult && part instanceof NodeTemplatePart) {
    value.renderInto(part);
    return true;
  }
  return false;
}

function processDocumentFragment(part, value) {
  if (value instanceof DocumentFragment && part instanceof NodeTemplatePart) {
    if (value.childNodes.length) part.replace(...value.childNodes);
    return true;
  }
  return false;
}

export function processPropertyIdentity(part, value) {
  if (part instanceof AttributeTemplatePart) {
    const ns = part.attributeNamespace;
    const oldValue = part.element.getAttributeNS(ns, part.attributeName);
    if (String(value) !== oldValue) {
      part.value = String(value);
    }
    return true;
  }
  part.value = String(value);
  return true;
}

export function processBooleanAttribute(part, value) {
  if (
    typeof value === 'boolean' &&
    part instanceof AttributeTemplatePart
    // can't use this because on custom elements the props are always undefined
    // typeof part.element[part.attributeName as keyof Element] === 'boolean'
  ) {
    const ns = part.attributeNamespace;
    const oldValue = part.element.hasAttributeNS(ns, part.attributeName);
    if (value !== oldValue) {
      part.booleanValue = value;
    }
    return true;
  }
  return false;
}

export function processBooleanNode(part, value) {
  if (value === false && part instanceof NodeTemplatePart) {
    part.replace('');
    return true;
  }
  return false;
}

function isIterable(value) {
  return typeof value === 'object' && Symbol.iterator in value;
}

function processIterable(part, value) {
  if (!isIterable(value)) return false;
  if (part instanceof NodeTemplatePart) {
    const nodes = [];
    for (const item of value) {
      if (item instanceof TemplateResult) {
        const fragment = document.createDocumentFragment();
        item.renderInto(fragment);
        nodes.push(...fragment.childNodes);
      } else if (item instanceof DocumentFragment) {
        nodes.push(...item.childNodes);
      } else {
        nodes.push(String(item));
      }
    }
    if (nodes.length) part.replace(...nodes);
    return true;
  } else {
    part.value = Array.from(value).join(' ');
    return true;
  }
}

export function processFunction(part, value) {
  if (typeof value === 'function') {
    value(part);
    return true;
  }
  return false;
}

export function processPart(part, value) {
  processFunction(part, value) ||
    processBooleanAttribute(part, value) ||
    processEvent(part, value) ||
    processBooleanNode(part, value) ||
    processSubTemplate(part, value) ||
    processDocumentFragment(part, value) ||
    processIterable(part, value) ||
    processPropertyIdentity(part, value);
}

const templates = new WeakMap();
const renderedTemplates = new WeakMap();
const renderedTemplateInstances = new WeakMap();
export class TemplateResult {
  #template;

  constructor(strings, values, processor) {
    this.strings = strings;
    this.values = values;
    this.processor = processor;
  }
  set template(value) {
    this.#template = value;
  }
  get template() {
    if (this.#template) return this.#template;

    if (templates.has(this.strings)) {
      return templates.get(this.strings);
    } else {
      const template = document.createElement('template');
      const end = this.strings.length - 1;
      template.innerHTML = this.strings.reduce(
        (str, cur, i) => str + cur + (i < end ? `{{ ${i} }}` : ''),
        ''
      );
      templates.set(this.strings, template);
      return template;
    }
  }
  renderInto(element) {
    const template = this.template;
    if (renderedTemplates.get(element) !== template) {
      renderedTemplates.set(element, template);
      const instance = new TemplateInstance(
        template,
        this.values,
        this.processor
      );
      renderedTemplateInstances.set(element, instance);
      if (element instanceof NodeTemplatePart) {
        element.replace(...instance.children);
      } else {
        element.appendChild(instance);
      }
      return;
    }
    const templateInstance = renderedTemplateInstances.get(element);
    if (templateInstance) {
      templateInstance.update(this.values);
    }
  }
}

const defaultProcessor = createProcessor(processPart);
export function coreHtml(strings, ...values) {
  return new TemplateResult(strings, values, defaultProcessor);
}

export function render(result, element) {
  result.renderInto(element);
}

const templateResults = new Map();

export function templateInstance(templateNode, values, { key = '' }) {
  key += templateNode.outerHTML;

  if (templateResults.has(key)) {
    const result = templateResults.get(key);
    result.values = values;
    return result;
  }

  const result = new TemplateResult([], values, defaultProcessor);
  result.template = templateNode;
  templateResults.set(key, result);
  return result;
}

export const unsafeHTML = (value) => (part) => {
  if (!(part instanceof NodeTemplatePart)) return;
  const template = document.createElement('template');
  template.innerHTML = value;
  const fragment = document.importNode(template.content, true);
  part.replace(...fragment.childNodes);
};

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Prevents JSON injection attacks.
 *
 * The goals of this brand:
 *   1) fast to check
 *   2) code is small on the wire
 *   3) multiple versions of Lit in a single page will all produce mutually
 *      interoperable StaticValues
 *   4) normal JSON.parse (without an unusual reviver) can not produce a
 *      StaticValue
 *
 * Symbols satisfy (1), (2), and (4). We use Symbol.for to satisfy (3), but
 * we don't care about the key, so we break ties via (2) and use the empty
 * string.
 */
const brand = Symbol.for('');

/** Safely extracts the string part of a StaticValue. */
const unwrapStaticValue = (value) => {
  if (value?.r !== brand) {
    return undefined;
  }
  return value?.['_$litStatic$'];
};

/**
 * Wraps a string so that it behaves like part of the static template
 * strings instead of a dynamic value.
 *
 * Users must take care to ensure that adding the static string to the template
 * results in well-formed HTML, or else templates may break unexpectedly.
 *
 * Note that this function is unsafe to use on untrusted content, as it will be
 * directly parsed into HTML. Do not pass user input to this function
 * without sanitizing it.
 *
 * Static values can be changed, but they will cause a complete re-render
 * since they effectively create a new template.
 */
// edit Wesley Luyten, 05/02/2022, add support for joining template results.
export const unsafeStatic = (...values) => ({
  ['_$litStatic$']: values.map((value) => {
    return value instanceof TemplateResult ? value : { strings: [value] };
  }),
  r: brand,
});

const stringsCache = new Map();

/**
 * Wraps a lit-html template tag (`html` or `svg`) to add static value support.
 */
// edit Wesley Luyten, 05/02/2022, add support for joining template results.
export const withStatic =
  (coreTag) =>
  (strings, ...values) => {
    const staticStrings = [''];
    let dynamicValues = [];
    let staticValues;
    let hasStatics = false;

    const join = (strs, vals = []) => {
      staticStrings[staticStrings.length - 1] =
        staticStrings[staticStrings.length - 1] + strs[0];

      vals.forEach((dynamicValue, i) => {
        if ((staticValues = unwrapStaticValue(dynamicValue)) !== undefined) {
          staticValues.forEach((staticValue) => {
            join(staticValue.strings, staticValue.values);
          });

          staticStrings[staticStrings.length - 1] =
            staticStrings[staticStrings.length - 1] + strs[i + 1];
          hasStatics = true;
        } else {
          dynamicValues.push(dynamicValue);
          staticStrings.push(strs[i + 1]);
        }
      });
    };

    join(strings, values);

    if (hasStatics) {
      const key = staticStrings.join('$$lit$$');
      strings = stringsCache.get(key);
      if (strings === undefined) {
        // Beware: in general this pattern is unsafe, and doing so may bypass
        // lit's security checks and allow an attacker to execute arbitrary
        // code and inject arbitrary content.
        staticStrings.raw = staticStrings;
        stringsCache.set(key, (strings = staticStrings));
      }
      values = dynamicValues;
    }

    return coreTag(strings, ...values);
  };

export const html = withStatic(coreHtml);
