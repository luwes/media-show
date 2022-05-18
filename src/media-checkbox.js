import '/node_modules/@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import { MediaProp } from './media-prop.js';
import { html } from './html.js';

// prettier-ignore
const template = (props) => html`
  <style>
    ${props.styles(props)}
  </style>
  <b>${props.label}</b><i>
    <sl-checkbox
      value="${props.label}"
      checked="${props.value != 'null'}"
    ></sl-checkbox>
  </i>
  <slot></slot>
`;

class MediaCheckbox extends MediaProp {
  static template = template;

  constructor() {
    super();

    this.shadowRoot.addEventListener('sl-change', (event) => {
      this.dispatchEvent(
        new CustomEvent('ms-change', {
          detail: { [event.target.value]: event.target.checked },
          composed: true,
          bubbles: true,
        })
      );
    });
  }
}

if (!customElements.get('media-checkbox')) {
  customElements.define('media-checkbox', MediaCheckbox);
}

export { MediaCheckbox };
