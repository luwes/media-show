import '/node_modules/@shoelace-style/shoelace/dist/components/input/input.js';
import '/node_modules/@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '/node_modules/@shoelace-style/shoelace/dist/components/menu/menu.js';
import '/node_modules/@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '/node_modules/@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { registerIconLibrary } from '/node_modules/@shoelace-style/shoelace/dist/utilities/icon-library.js';
import { MsBaseElement } from './base-element.js';
import { html, css, render, unsafeHTML } from './html.js';
import { escapeRegExp } from './utils.js';

registerIconLibrary('default', {
  resolver: (name) =>
    `/node_modules/@shoelace-style/shoelace/dist/assets/icons/${name}.svg`,
});

const styles = () => css`
  :host {
    display: inline-block;
  }

  sl-dropdown {
    width: 100%;
  }
`;

const template = (props) => html`
  <style>
    ${styles(props)}
  </style>
  <sl-input placeholder="${props.placeholder}" label="${props.label}">
    <slot name="suffix" slot="suffix">
      <sl-icon-button name="chevron-down" label="Open menu"></sl-icon-button>
    </slot>
  </sl-input>
  <sl-dropdown open="${props.open}">
    <sl-menu>
      ${props.results.length > 0
        ? props.results.map(
            (item) => html`
              <sl-menu-item value="${JSON.stringify(item)}">
                ${unsafeHTML(props.highlight(item.name))}
              </sl-menu-item>
            `
          )
        : [
            html` <sl-menu-item disabled>
              Found 0 matching results for
              "${unsafeHTML(`<b>${props.query}</b>`)}"
            </sl-menu-item>`,
          ]}
    </sl-menu>
  </sl-dropdown>
`;

class MsInputList extends MsBaseElement {
  static observedAttributes = ['media-show'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.open = false;
    this.data = [];
  }

  async connectedCallback() {
    this.render();
    this.data = await (await fetch(this.getAttribute('src'))).json();
    this.render();

    this.addEventListener('sl-input', () => {
      this.open = true;
      this.render();
    });

    this.addEventListener('sl-focus', () => {
      this.open = true;
      this.render();
    });

    this.addEventListener('sl-select', ({ detail }) => {
      this.input.value = detail.item.innerText;
      this.dispatchEvent(
        new CustomEvent('ms-change', {
          detail: JSON.parse(detail.item.value),
          composed: true,
          bubbles: true,
        })
      );
    });

    document.addEventListener('mousedown', (event) => {
      const path = event.composedPath();
      if (path.includes(this.input)) {
        event.stopImmediatePropagation();
      }
    });

    this.shadowRoot
      .querySelector('sl-icon-button')
      .addEventListener('click', (event) => {
        event.stopImmediatePropagation();

        if (this.input.value != '') {
          this.input.value = '';
        } else {
          this.open = !this.dropdown.open;
        }
        this.render();
      });

    this.input.addEventListener('keydown', (event) => {
      if (['Enter'].includes(event.key)) {
        event.preventDefault();

        this.dispatchEvent(
          new CustomEvent('ms-change', {
            detail: { src: this.input.value },
            composed: true,
            bubbles: true,
          })
        );

        this.open = false;
        this.render();
        return;
      }

      // Move the selection when pressing down or up
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = this.menu.getAllItems({ includeDisabled: false });
        const activeItem = this.menu.getCurrentItem();
        let index = activeItem ? items.indexOf(activeItem) : 0;

        if (items.length > 0) {
          event.preventDefault();

          if (event.key === 'Home') {
            index = 0;
          } else if (event.key === 'End') {
            index = items.length - 1;
          }

          if (index < 0) {
            index = items.length - 1;
          }
          if (index > items.length - 1) {
            index = 0;
          }

          this.menu.setCurrentItem(items[index]);
          items[index].focus();

          return;
        }
      }
    });
  }

  get dropdown() {
    return this.shadowRoot.querySelector('sl-dropdown');
  }

  get input() {
    return this.shadowRoot.querySelector('sl-input');
  }

  get menu() {
    return this.shadowRoot.querySelector('sl-menu');
  }

  get value() {
    return this.input.value;
  }

  render() {
    const pattern = new RegExp(
      `(${escapeRegExp(this.input?.value ?? '')})`,
      'ig'
    );
    const results = this.data.filter((attrs) => pattern.test(attrs.name));

    render(
      template({
        results,
        open: this.open,
        placeholder: this.getAttribute('placeholder') ?? '',
        label: this.getAttribute('label') ?? '',
        query: this.input?.value,
        highlight: (text) => {
          if (!this.input?.value) return text;
          return text.replace(pattern, `<mark>$1</mark>`);
        },
      }),
      this.shadowRoot
    );
  }
}

if (!customElements.get('ms-input-list')) {
  customElements.define('ms-input-list', MsInputList);
}

export default MsInputList;
