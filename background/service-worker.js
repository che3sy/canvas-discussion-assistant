// Background worker
// Handles API calls to avoid annoyinhg CORS issues

// Claude stuff
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

async function callClaudeAPI({ apiKey, model, systemPrompt, userPrompt, temperature, maxTokens }) {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
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
      return { success: true, text: data.content[0].text };
    } else {
      throw new Error('No content in API response');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function generateMainPost(params) {
  const { topic, courseName = 'your course', requirements = '', teacherInstructions = '', sideInstructions = '', temperature, maxTokens } = params;

  const systemPrompt = `You are a student in a ${courseName} course responding to a discussion prompt. Generate content that will be edited by the student, so keep it natural and conversational.${sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ''}`;

  const userPrompt = `Discussion Topic: ${topic}

${teacherInstructions ? `Teacher's Instructions:\n${teacherInstructions}\n` : ''}
${requirements ? `Requirements: ${requirements}\n` : ''}
Generate a thoughtful discussion post that:
- Demonstrates understanding of the topic
- Follows the teacher's instructions and requirements
- Uses conversational tone (not overly formal/AI-like)
- Leaves room for personal touches and examples
- ${requirements ? 'Meets the stated requirements' : 'Is substantive and engaging'}

Provide only the post content, no meta-commentary.`;

  return await callClaudeAPI({
    ...params,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens
  });
}

async function generateReply(params) {
  const { originalPost, authorName = 'your classmate', topic, sideInstructions = '', temperature, maxTokens } = params;

  const systemPrompt = `You are a student responding to a classmate's discussion post. This will be edited before posting, so keep it genuine and conversational.${sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ''}`;

  const userPrompt = `Discussion Topic: ${topic}

${authorName}'s Post:
${originalPost}

Generate a constructive reply that:
- Engages with their ideas
- Uses natural, student-like language
- Asks questions or adds insights
- Avoids overly formal
- Is friendly and respectful
- Keeps out common tropes like "It's not just X... it's Y..." or those suspiciously beautiful lists of three

Provide only the reply content, no meta-commentary.`;

  return await callClaudeAPI({
    ...params,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSettings') {
    browser.runtime.openOptionsPage();
    return true;
  }

  if (message.action === 'generateMainPost') {
    generateMainPost(message.params).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'generateReply') {
    generateReply(message.params).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

// Handle extension installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    browser.runtime.openOptionsPage();
  }
});
