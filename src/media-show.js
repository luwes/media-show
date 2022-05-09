import { MsBaseElement } from './base-element.js';
import {
  closestComposedNode,
  camelCase,
  serializeTimeRanges,
  toQuery,
  getParams,
  getParam,
  round,
  throttle,
} from './utils.js';
import { html, css, render } from './html.js';

const styles = () => css`
  :host {
    display: block;
    overflow: hidden;
  }
`;

const template = (props) => html`
  <style>
    ${styles(props)}
  </style>
  <slot></slot>
`;

const mediaAttrs = [
  'autoplay',
  'buffered',
  'controls',
  'current-time',
  'duration',
  'ended',
  'loop',
  'muted',
  'paused',
  'playback-rate',
  'poster',
  'preload',
  'ready-state',
  'src',
  'video-height',
  'video-width',
  'volume',
];

const urlStateAttrs = [
  'autoplay',
  'controls',
  'current-time',
  'loop',
  'muted',
  'poster',
  'preload',
  'src',
  'volume',
];

const mediaEvents = [
  'emptied',
  'durationchange',
  'ended',
  'error',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'timeupdate',
  'volumechange',
];

const getStateAttrs = (el, baseAttrs = []) => {
  return [...baseAttrs, ...el.templateAttrs, ...el.includeAttrs].filter(
    (attr) => {
      return !el.excludeAttrs.includes(attr);
    }
  );
};

const cleanups = new WeakMap();

class MediaShow extends MsBaseElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.render();

    const { media } = this;

    // Save the default media properties
    this.mediaDefaults =
      this.mediaDefaults ??
      getStateAttrs(this, urlStateAttrs).reduce((acc, attr) => {
        const propName = camelCase(attr);
        acc[attr] = media[propName];
        return acc;
      }, {});

    let oldSrc = media.src;
    // Get the attribute names that need changing based on state saved in the browser URL.
    const changeAttrs = getStateAttrs(this, urlStateAttrs).filter((attr) => {
      return (
        getParam(attr) != null &&
        getParam(attr) !== String(this.mediaDefaults[attr])
      );
    });

    // Update the media state from the URL params.
    changeAttrs.forEach((attr) => {
      const propName = camelCase(attr);
      media[propName] = getParam(attr);
    });

    // If the src was updated remember the attributes that need to be cleaned up on a new src change.
    if (oldSrc !== media.src) {
      cleanups.set(media, (ignoreAttrs) => {
        changeAttrs
          .filter((attr) => !ignoreAttrs.includes(attr))
          .forEach((name) => media.removeAttribute(name));
      });
    }

    mediaEvents.forEach((event) => {
      media.addEventListener(event, updateMediaState);
    });

    this.addEventListener('ms-change', (event) => {
      let oldSrc = media.src;

      const changeAttrs = Object.keys(event.detail);
      changeAttrs.forEach((attr) => {
        const propName = camelCase(attr);
        media[propName] = event.detail[attr];
      });

      if (oldSrc !== media.src) {
        if (cleanups.get(media)) cleanups.get(media)(changeAttrs);

        cleanups.set(media, (ignoreAttrs) => {
          changeAttrs
            .filter((attr) => !ignoreAttrs.includes(attr))
            .forEach((name) => media.removeAttribute(name));
        });
      }

      updateMediaState({ target: this });
    });
  }

  get templateAttrs() {
    const template =
      this.querySelector('template')?.content.firstElementChild.cloneNode(true);
    return Array.from(template?.attributes ?? []).map(({ name }) => name);
  }

  get includeAttrs() {
    return this.getAttribute('include-attrs')?.split(' ') ?? [];
  }

  get excludeAttrs() {
    return this.getAttribute('exclude-attrs')?.split(' ') ?? [];
  }

  render() {
    render(
      template({
        styles,
      }),
      this.shadowRoot
    );
  }

  get media() {
    return this.querySelector('[slot=media]');
  }
}

function updateMediaState({ type, target }) {
  // Destructure event.target in the throttled function, event.target becomes null.
  propogatemediaAttrs({ type, target });
  throttledUpdateUrlState({ type, target });
}

/**
 * Propagates media attributes to all children that start with the ms- prefix
 * and have the attribute in their observedAttributes.
 */
function propogatemediaAttrs({ type, target }) {
  // Filter some attributes to not over tax setting attributes in the loop below.
  const attrFilter = {
    timeupdate: 'current-time',
    progress: 'buffered',
    volumechange: ['volume', 'muted'],
  }[type];

  const showcase = closestComposedNode('media-show', target);
  [...showcase.querySelectorAll('*')]
    .filter(
      (child) =>
        child.localName.startsWith('ms-') &&
        child.constructor.observedAttributes?.length
    )
    .forEach((msChild) =>
      getStateAttrs(showcase, mediaAttrs)
        .filter((attr) => !attrFilter || attrFilter.includes(attr))
        .forEach((attr) => {
          const propName = camelCase(attr);
          const mediaValue = showcase.media[propName];
          propogateMediaAttribute(msChild, `media-${attr}`, mediaValue);
        })
    );
}

const throttledUpdateUrlState = throttle(updateUrlState, 333);

function updateUrlState({ type, target }) {
  // Filter some attributes to not over tax setting attributes in the loop below.
  const attrFilter = {
    timeupdate: 'current-time',
    progress: 'buffered',
    volumechange: ['volume', 'muted'],
  }[type];

  const showcase = closestComposedNode('media-show', target);
  getStateAttrs(showcase, urlStateAttrs)
    .filter((attr) => !attrFilter || attrFilter.includes(attr))
    .forEach((attr) => {
      const propName = camelCase(attr);
      let value = showcase.media[propName];
      if (typeof value === 'number') value = round(value, 1);

      if (getParam(attr) === String(value)) return;

      const search = toQuery(
        {
          ...getParams(),
          [attr]: value,
        },
        showcase.mediaDefaults
      );

      const url = new URL(window.location.href);
      url.search = search;
      history.pushState({}, '', url);
    });
}

function propogateMediaAttribute(el, name, value) {
  if (value instanceof TimeRanges) {
    value = serializeTimeRanges(value);
    if (!value) return;
  }
  if (
    el.constructor.observedAttributes?.includes(name) &&
    el.getAttribute(name) !== String(value)
  ) {
    if (value == null || value === false) el.removeAttribute(name);
    else el.setAttribute(name, value === true ? '' : value);
  }
}

if (!customElements.get('media-show')) {
  customElements.define('media-show', MediaShow);
}

export default MediaShow;
