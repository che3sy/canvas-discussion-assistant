// Cross-browser compatibility
const browser = globalThis.browser || globalThis.chrome;

const Storage = {
	/**
	 * Get all settings from storage
	 * @returns {Promise<Object>} Settings object
	 */
	async getSettings() {
		try {
			const settings = await browser.storage.local.get([
				"aiProvider",
				"claudeApiKey",
				"claudeModel",
				"geminiApiKey",
				"geminiModel",
				"replyCount",
				"temperature",
				"maxTokens",
				"sideInstructions",
			]);

			return {
				aiProvider: settings.aiProvider || "claude",
				claudeApiKey: settings.claudeApiKey || "",
				claudeModel: settings.claudeModel || "claude-sonnet-4-5-20250929",
				geminiApiKey: settings.geminiApiKey || "",
				geminiModel: settings.geminiModel || "gemini-2.5-pro",
				replyCount: settings.replyCount || 3,
				temperature:
					settings.temperature !== undefined ? settings.temperature : 0.7,
				maxTokens: settings.maxTokens || 1000,
				sideInstructions: settings.sideInstructions || "",
			};
		} catch (error) {
			throw error;
		}
	},

	/**
	 * Save settings to storage
	 * @param {Object} settings - Settings to save
	 * @returns {Promise<void>}
	 */
	async saveSettings(settings) {
		try {
			await browser.storage.local.set(settings);
		} catch (error) {
			throw error;
		}
	},

	/**
	 * Get just the API key
	 * @returns {Promise<string|null>}
	 */
	async getApiKey() {
		try {
			const { apiKey } = await browser.storage.local.get("apiKey");
			return apiKey || null;
		} catch (error) {
			return null;
		}
	},
};

if (typeof module !== "undefined" && module.exports) {
	module.exports = Storage;
}
