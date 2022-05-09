import { MsBaseElement } from './base-element.js';
import { render, html, css, unsafeStatic, templateInstance } from './html.js';
import { round, kebabCase } from './utils.js';

const styles = (props) => css`
  * {
    box-sizing: border-box;
  }

  :host {
    --ms-padding-internal: var(--ms-padding, 0.5rem);
    display: inline-block;
    line-height: 0;
  }

  ::slotted([slot='media']) {
    width: 100%;
  }

  ${props.localName},
  video {
    width: 100%;
  }

  ${props.sizes
    .map(
      (size) =>
        css`
          .size-${CSS.escape(size)} {
            float: left;
            ${props.aspectRatio < 1
              ? `width: calc(${size} * ${props.aspectRatio});`
              : `width: ${size};`}
            padding: var(--ms-padding-internal);
          }
        `
    )
    .join('')}
`;

const defaultMediaTemplate = document.createElement('template');
defaultMediaTemplate.innerHTML = `
  <video
    src="{{src}}"
    poster="{{poster}}"
    controls="{{controls}}"
    preload="{{preload}}"
    autoplay="{{autoplay}}"
    muted="{{muted}}"
    loop="{{loop}}"
  ></video>
`;

const template = (props) => {
  // prettier-ignore
  return html`
    <style>
      ${styles(props)}
    </style>
    <div class="size-${props.sizes[0]}">
      <slot name="media"></slot>
    </div>
    ${unsafeStatic(...props.sizes.slice(1).map((size, i) => html`
      <div class="size-${size}">
        ${templateInstance(props.template, props, { key: i })}
      </div>
    `))}`;
};

// Warning: assuming there is just 1 instance of media-show.
const mediaTemplate = (
  document.querySelector('media-show template') ?? defaultMediaTemplate
)?.content.firstElementChild.cloneNode(true);

const includedAttrs = Array.from(mediaTemplate?.attributes ?? [])
  .map(({ value }) => {
    const propMatches = value.match(/\{\{\s*(\w*?)\s*\}\}/);
    return propMatches && propMatches[1];
  })
  .filter(Boolean)
  .map((prop) => `media-${kebabCase(prop)}`);

class MsSizes extends MsBaseElement {
  static observedAttributes = ['media-show', 'sizes', ...includedAttrs];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.addEventListener('slotchange', () => {
      this.aspectRatio = round(
        this.media?.offsetWidth / this.media?.offsetHeight
      );

      const resizeObserver = new ResizeObserver(() => {
        const ratio = round(this.media?.offsetWidth / this.media?.offsetHeight);
        if (this.aspectRatio !== ratio) {
          this.aspectRatio = ratio;
          this.render();
        }
      });
      resizeObserver.observe(this.media);
    });
  }

  attributeChangedCallback() {
    this.render();
  }

  get template() {
    return this.querySelector('template') ?? defaultMediaTemplate;
  }

  get templateAttrNodes() {
    return Array.from(
      this.template?.content.firstElementChild.attributes ?? []
    );
  }

  get media() {
    return this.querySelector('[slot=media]');
  }

  render() {
    // Get all the props that were used in the template.
    const templateProps = this.templateAttrNodes
      .map(({ value }) => {
        const propMatches = value.match(/\{\{\s*(\w*?)\s*\}\}/);
        return propMatches && propMatches[1];
      })
      .filter(Boolean);

    const mediaProps = {};
    for (let prop of templateProps) {
      const value = this.getAttribute(`media-${kebabCase(prop)}`);
      // Attrs that are not set get a prop value of false for the template.
      mediaProps[prop] = value == null ? false : value;
    }

    render(
      template({
        sizes: this.sizes,
        height: this.offsetHeight,
        aspectRatio: this.aspectRatio,
        template: this.template,
        localName: this.media.localName,
        ...mediaProps,
      }),
      this.shadowRoot
    );
  }

  get sizes() {
    return this.getAttribute('sizes').split(' ');
  }
}

if (!customElements.get('ms-sizes')) {
  customElements.define('ms-sizes', MsSizes);
}

export default MsSizes;
