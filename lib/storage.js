const Storage = {
  /**
   * Get all settings from storage
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const settings = await browser.storage.local.get([
        'apiKey',
        'model',
        'replyCount',
        'temperature',
        'maxTokens',
        'sideInstructions'
      ]);

      return {
        apiKey: settings.apiKey || '',
        model: settings.model || 'claude-3-5-sonnet-20240620',
        replyCount: settings.replyCount || 3,
        temperature: settings.temperature !== undefined ? settings.temperature : 0.7,
        maxTokens: settings.maxTokens || 1000,
        sideInstructions: settings.sideInstructions || ''
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
   * Check if API key is configured
   * @returns {Promise<boolean>}
   */
  async hasApiKey() {
    try {
      const { apiKey } = await browser.storage.local.get('apiKey');
      return !!apiKey && apiKey.startsWith('sk-ant-');
    } catch (error) {
      return false;
    }
  },

  /**
   * Get just the API key
   * @returns {Promise<string|null>}
   */
  async getApiKey() {
    try {
      const { apiKey } = await browser.storage.local.get('apiKey');
      return apiKey || null;
    } catch (error) {
      return null;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
