import '/node_modules/@shoelace-style/shoelace/dist/components/split-panel/split-panel.js';
import { MsBaseElement } from './base-element.js';
import { html, css, render } from './html.js';
import { toQuery, getParams, getParam, round, debounce } from './utils.js';

const styles = () => css`
  :host {
    line-height: 0;
  }

  sl-split-panel {
    min-height: 100%;
  }
`;

const template = (props) => html`
  <style>
    ${styles(props)}
  </style>

  <sl-split-panel position="${props.position ?? 50}" snap="${props.snap}">
    <slot name="start" slot="start"></slot>
    <slot name="end" slot="end"></slot>
  </sl-split-panel>
`;

class MsSplitPanel extends MsBaseElement {
  static observedAttributes = ['position'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.id && getParam(this.id)) {
      this.setAttribute('position', getParam(this.id));
    }

    this.render();

    this.shadowRoot.addEventListener(
      'sl-reposition',
      debounce(() => {
        this.setAttribute(
          'position',
          round(this.shadowRoot.querySelector('sl-split-panel').position, 2)
        );
      }, 250)
    );
  }

  attributeChangedCallback(name, old, value) {
    if (!this.defaultPosition) {
      this.defaultPosition = this.getAttribute('position') ?? 50;
    }

    if (name === 'position' && this.id && old) {
      const search = toQuery({
        ...getParams(),
        [this.id]: value !== this.defaultPosition ? value : undefined,
      });
      const url = new URL(window.location.href);
      url.search = search;
      history.pushState({}, '', url);
    }
  }

  render() {
    render(
      template({
        position: this.getAttribute('position'),
        snap: this.getAttribute('snap'),
      }),
      this.shadowRoot
    );
  }
}

if (!customElements.get('ms-split-panel')) {
  customElements.define('ms-split-panel', MsSplitPanel);
}

export default MsSplitPanel;
