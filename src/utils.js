export function serializeTimeRanges(timeRanges = []) {
  return Array.from(timeRanges)
    .map((_, i) =>
      [
        Number(timeRanges.start(i).toFixed(2)),
        Number(timeRanges.end(i).toFixed(2)),
      ].join(':')
    )
    .join(' ');
}

export function getParam(key, defaultValue) {
  const params = new URLSearchParams(location.search);
  return params.has(key)
    ? params.get(key) === '1'
      ? true
      : params.get(key) === '0'
      ? false
      : params.get(key)
    : defaultValue;
}

export function getParams() {
  return Object.fromEntries(new URLSearchParams(location.search));
}

export function toParams(obj, defaults = {}) {
  const values = {};
  for (let key in obj) {
    let value = typeof obj[key] === 'function' ? obj[key]() : obj[key];
    if (typeof defaults[key] === 'boolean') value = !!value;
    if (value == defaults[key]) continue;

    if (value === undefined) delete values[key];
    else if (value === true) values[key] = 1;
    else if (!value) values[key] = 0;
    else values[key] = value;
  }
  return new URLSearchParams(values);
}

export function toQuery(obj, defaults) {
  const params = toParams(obj, defaults).toString();
  return params ? '?' + params : '';
}

export function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function kebabCase(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function camelCase(name) {
  return name.replace(/[-_]([a-z])/g, ($0, $1) => $1.toUpperCase());
}

export const pick = (obj, ...keys) =>
  Object.fromEntries(
    keys.filter((key) => key in obj).map((key) => [key, obj[key]])
  );

export function closestComposedNode(selector, base = this) {
  function __closestFrom(el) {
    if (!el || el === document || el === window) return null;
    let found = el.closest(selector);
    return found ? found : __closestFrom(el.getRootNode().host);
  }
  return __closestFrom(base);
}

export function toHHMMSS(secs) {
  if (!secs) return 0;
  if (Number.isNaN(secs)) return secs;

  const sec_num = parseInt(secs, 10),
    hours = Math.floor(sec_num / 3600),
    minutes = Math.floor(sec_num / 60) % 60,
    seconds = sec_num % 60;

  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? '0' + v : v))
    .filter((v, i) => v !== '00' || i > 0)
    .join(':');
}

export function round(num, precision = 2) {
  return +(Math.round(num + 'e+' + precision) + 'e-' + precision);
}

export function prettyQuality(height) {
  if (!height) return 'n/a';
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  return `${height}p`;
}

export function getBreakpoints(el, breakpoints) {
  return Object.keys(breakpoints)
    .filter((key) => {
      return el.offsetWidth >= breakpoints[key];
    })
    .join(' ');
}

export function debounce(fn, delay) {
  let timeoutID = null;
  return function (...args) {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
export function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function () {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function () {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}
