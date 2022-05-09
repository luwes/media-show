import { MsBaseElement } from './base-element.js';
import { prettyQuality, toHHMMSS, round, kebabCase, debounce } from './utils.js';
import { html, css, render } from './html.js';

const styles = () => css`
  :host {
    display: inline-block;
    line-height: 1.5;
  }

  b,
  i {
    display: inline-block;
  }

  b {
    width: 55%;
    text-align: right;
    padding-right: 0.7rem;
  }
`;

// prettier-ignore
const template = (props) => html`
  <style>
    ${props.styles(props)}
  </style>
  <b>${props.label}</b><i>${props.value}</i>
  <slot></slot>
`;

class MediaProp extends MsBaseElement {
  static styles = styles;
  static template = template;

  static observedAttributes = [
    'media-show',
    'name',
    'type',
    'label',
    'media-autoplay',
    'media-buffered',
    'media-current-time',
    'media-duration',
    'media-ended',
    'media-loop',
    'media-muted',
    'media-paused',
    'media-playback-rate',
    'media-ready-state',
    'media-video-height',
    'media-volume',
  ];

  static bool(value) {
    return String(value == null ? false : true);
  }

  static quality(value) {
    return prettyQuality(value);
  }

  static time(value) {
    return toHHMMSS(Number(value));
  }

  static buffered(buffered, el) {
    const duration = Number(el.getAttribute('media-duration'));
    buffered = buffered?.split(' ').map((timePair) => timePair.split(':'));
    return buffered?.length
      ? round(Number(buffered[buffered.length - 1][1]) / duration, 2)
      : 0;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.debouncedRender = debounce(this.render, 100);
  }

  get name() {
    return this.getAttribute('name');
  }

  get label() {
    return this.getAttribute('label');
  }

  get type() {
    return this.getAttribute('type');
  }

  attributeChangedCallback() {
    this.debouncedRender();
  }

  render() {
    let value = (this.type ? MediaProp[this.type] : String)(
      this.getAttribute(`media-${kebabCase(this.name)}`),
      this
    );

    render(
      this.constructor.template({
        value,
        name: this.name,
        label: this.label ?? this.name,
        styles: this.constructor.styles,
      }),
      this.shadowRoot
    );
  }
}

if (!customElements.get('media-prop')) {
  customElements.define('media-prop', MediaProp);
}

export default MediaProp;
