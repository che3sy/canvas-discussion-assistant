const ClaudeAPI = {
  API_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',

  /**
   * Generate a main discussion post
   * @param {Object} params - Generation parameters
   * @param {string} params.apiKey - Claude API key
   * @param {string} params.model - Model to use
   * @param {string} params.topic - Discussion topic/prompt
   * @param {string} params.courseName - Name of the course
   * @param {string} params.requirements - Any specific requirements (word count, citations, etc.)
   * @param {string} params.sideInstructions - Additional user instructions for style/tone
   * @param {number} params.temperature - Temperature setting
   * @param {number} params.maxTokens - Max tokens for response
   * @returns {Promise<string>} Generated post content
   */
  async generateMainPost({
    apiKey,
    model,
    topic,
    courseName = 'your course',
    requirements = '',
    sideInstructions = '',
    temperature = 0.7,
    maxTokens = 1000
  }) {
    const systemPrompt = `You are a student in a ${courseName} course responding to a discussion prompt. Generate content that will be edited by the student, so keep it natural and conversational.${sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ''}`;

    const userPrompt = `Discussion Topic: ${topic}

${requirements ? `Requirements: ${requirements}` : ''}

Generate a thoughtful discussion post that:
- Demonstrates understanding of the topic
- Uses conversational tone (not overly formal/AI-like)
- Leaves room for personal touches and examples
- ${requirements ? 'Meets the stated requirements' : 'Is substantive and engaging'}

Provide only the post content, no meta-commentary.`;

    return await this._makeRequest({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens
    });
  },

  async generateReply({
    apiKey,
    model,
    originalPost,
    authorName = 'your classmate',
    topic,
    sideInstructions = '',
    temperature = 0.7,
    maxTokens = 1000
  }) {
    const systemPrompt = `You are a student responding to a classmate's discussion post. This will be edited before posting, so keep it genuine and conversational.${sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ''}`;

    const userPrompt = `Discussion Topic: ${topic}

${authorName}'s Post:
${originalPost}

Generate a constructive reply that:
- Engages authentically with their ideas
- Uses natural, student-like language
- Asks questions or adds insights
- Avoids overly formal or AI-sounding phrasing
- Is friendly and respectful

Provide only the reply content, no meta-commentary.`;

    return await this._makeRequest({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens
    });
  },

  /**
   * Make a request to Claude API
   * @private
   */
  async _makeRequest({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens
  }) {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': this.API_VERSION
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
          `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      } else {
        throw new Error('No content in API response');
      }
    } catch (error) {
      throw error;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaudeAPI;
}
