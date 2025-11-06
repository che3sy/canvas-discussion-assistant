// Cross-platform browser polyfill for extensions
// - If `browser` (the WebExtension API) exists (Firefox / browsers with native support), keep it.
// - Otherwise, when `chrome` exists (Chrome/Edge), expose a small `browser` object that
//   provides Promise-based `storage.local` and `runtime.sendMessage` while preserving
//   callback-style compatibility.
// - Do NOT overwrite an existing `browser` global.

/* eslint-disable no-undef */
(function () {
	// Prefer the global `browser` if it already exists (Firefox).
	if (
		typeof globalThis !== "undefined" &&
		typeof globalThis.browser !== "undefined"
	) {
		return; // native browser exists, nothing to do
	}

	// If chrome is not available, provide a minimal no-op browser to avoid runtime crashes
	if (
		typeof globalThis === "undefined" ||
		typeof globalThis.chrome === "undefined"
	) {
		if (typeof globalThis !== "undefined") {
			globalThis.browser = {
				runtime: { sendMessage: () => Promise.resolve() },
				storage: {
					local: {
						get: () => Promise.resolve({}),
						set: () => Promise.resolve(),
						remove: () => Promise.resolve(),
						clear: () => Promise.resolve(),
					},
				},
			};
		}
		return;
	}

	const chromeRef = globalThis.chrome;

	// Helper to convert a single-callback chrome API into a Promise-returning function
	function promisifyChromeCall(fn, ctx) {
		return (...args) =>
			new Promise((resolve, reject) => {
				try {
					fn.call(ctx, ...args, (result) => {
						const err = chromeRef.runtime && chromeRef.runtime.lastError;
						if (err) reject(err);
						else resolve(result);
					});
				} catch (e) {
					reject(e);
				}
			});
	}

	const poly = {};

	// runtime.sendMessage: support both callback and Promise styles
	poly.runtime = Object.assign({}, chromeRef.runtime);
	poly.runtime.sendMessage = (...args) => {
		const last = args[args.length - 1];
		const hasCallback = typeof last === "function";
		if (hasCallback) return chromeRef.runtime.sendMessage(...args);
		return new Promise((resolve, reject) => {
			try {
				chromeRef.runtime.sendMessage(args[0], (res) => {
					const err = chromeRef.runtime && chromeRef.runtime.lastError;
					if (err) reject(err);
					else resolve(res);
				});
			} catch (e) {
				reject(e);
			}
		});
	};

	// storage.local helpers
	poly.storage = poly.storage || {};
	poly.storage.local = {
		get: (keys) =>
			promisifyChromeCall(
				chromeRef.storage.local.get,
				chromeRef.storage.local
			)(keys),
		set: (obj) =>
			promisifyChromeCall(
				chromeRef.storage.local.set,
				chromeRef.storage.local
			)(obj),
		remove: (keys) =>
			promisifyChromeCall(
				chromeRef.storage.local.remove,
				chromeRef.storage.local
			)(keys),
		clear: () =>
			promisifyChromeCall(
				chromeRef.storage.local.clear,
				chromeRef.storage.local
			)(),
	};

	// expose some passthroughs for convenience
	if (chromeRef.tabs) poly.tabs = chromeRef.tabs;
	if (chromeRef.windows) poly.windows = chromeRef.windows;
	if (chromeRef.cookies) poly.cookies = chromeRef.cookies;

	// Attach to globalThis only if not present
	try {
		if (
			typeof globalThis !== "undefined" &&
			typeof globalThis.browser === "undefined"
		) {
			globalThis.browser = poly;
		}
	} catch (e) {
		// ignore
	}

	// CommonJS export for tools/tests
	if (typeof module !== "undefined" && module.exports) {
		try {
			module.exports = poly;
		} catch (e) {}
	}
})();

/* eslint-enable no-undef */
/* eslint-enable no-undef */
