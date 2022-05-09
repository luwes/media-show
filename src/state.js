import '/node_modules/@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import { MsBaseElement } from './base-element.js';
import { prettyQuality, toHHMMSS, round } from './utils.js';
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
    ${styles()}
  </style>
  <b>paused</b><i>${props.paused}</i>
  <b>readyState</b><i>${props.readyState}</i>
  <b>volume</b><i>${props.volume}</i>
  <b>buffered</b><i>${props.buffered}</i>
  <b>duration</b><i>${props.duration}</i>
  <b>time</b><i>${props.currentTime}</i>
  <b>ended</b><i>${props.ended}</i>
  <b>quality</b><i>${props.quality}</i>
  <b>rate</b><i>${props.playbackRate}</i>
  <b>autoplay</b><i><sl-checkbox value="autoplay" checked="${props.autoplay}"></sl-checkbox></i>
  <b>muted</b><i><sl-checkbox value="muted" checked="${props.muted}"></sl-checkbox></i>
  <b>loop</b><i><sl-checkbox value="loop" checked="${props.loop}"></sl-checkbox></i>
  <b>controls</b><i><sl-checkbox value="controls" checked="${props.controls}"></sl-checkbox></i>
  <slot></slot>
`;

class MsState extends MsBaseElement {
  static observedAttributes = [
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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.render();

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

  attributeChangedCallback() {
    this.render();
  }

  render() {
    render(
      template({
        quality: prettyQuality(this.getAttribute('media-video-height')),
        duration: toHHMMSS(Number(this.getAttribute('media-duration'))),
        currentTime: toHHMMSS(Number(this.getAttribute('media-current-time'))),
        buffered: getBuffered(
          this.getAttribute('media-buffered'),
          Number(this.getAttribute('media-duration'))
        ),
        paused: String(this.hasAttribute('media-paused')),
        readyState: this.getAttribute('media-ready-state'),
        volume: this.getAttribute('media-volume'),
        ended: String(this.hasAttribute('media-ended')),
        playbackRate: this.getAttribute('media-playback-rate'),
        autoplay: this.hasAttribute('media-autoplay'),
        loop: this.hasAttribute('media-loop'),
        muted: this.hasAttribute('media-muted'),
        controls: this.hasAttribute('media-controls'),
      }),
      this.shadowRoot
    );
  }
}

function getBuffered(buffered, duration) {
  buffered = buffered?.split(' ').map((timePair) => timePair.split(':'));
  return buffered?.length
    ? round(Number(buffered[buffered.length - 1][1]) / duration, 2)
    : 0;
}

if (!customElements.get('ms-state')) {
  customElements.define('ms-state', MsState);
}

export default MsState;
