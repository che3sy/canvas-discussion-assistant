// Gemini API handler for Canvas Discussion Assistant
// Uses fetch to call Gemini API directly (browser compatible)
const GEMINI_API_URL =
	"https://generativelanguage.googleapis.com/v1beta/models";

const GeminiAPI = {
	async generateContent({
		apiKey,
		model,
		prompt,
		temperature,
		maxTokens,
		systemInstruction,
		thinkingBudget,
	}) {
		try {
			const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
			const body = {
				contents: [{ parts: [{ text: prompt }] }],
			};
			// Gemini API expects generationConfig for generation params
			const generationConfig = {};
			if (typeof temperature === "number") {
				generationConfig.temperature = temperature;
			}
			if (typeof maxTokens === "number") {
				generationConfig.maxOutputTokens = maxTokens;
			}
			if (typeof thinkingBudget === "number") {
				generationConfig.thinkingConfig = { thinkingBudget };
			}
			if (Object.keys(generationConfig).length > 0) {
				body.generationConfig = generationConfig;
			}
			// systemInstruction is a top-level field, not inside generationConfig
			if (systemInstruction) {
				body.systemInstruction = { parts: [{ text: systemInstruction }] };
			}
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});
			const data = await response.json();
			return data;
		} catch (error) {
			return { error: error.message };
		}
	},
};

// Expose for both CommonJS (tests/tools) and browser/service-worker globals.
if (typeof globalThis !== "undefined") {
	try {
		globalThis.GeminiAPI = GeminiAPI;
	} catch (e) {
		// ignore
	}
}

// Also set on common worker/global aliases for maximum compatibility (service worker: `self`).
try {
	if (typeof self !== "undefined") {
		self.GeminiAPI = GeminiAPI;
	}
} catch (e) {
	// ignore
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = GeminiAPI;
}
