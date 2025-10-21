// "Global" browser variable

// I think firefox supports chrome namespace too but like it doesn't do promises so I'd have to rewrite a bunbch of stuff
const browserAPI = (function() {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  return chrome;
})();

if (typeof globalThis !== 'undefined') {
  globalThis.browser = browserAPI;
}