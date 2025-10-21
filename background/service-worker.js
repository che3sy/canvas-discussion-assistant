// Background worker
// Handles API calls to avoid annoyinhg CORS issues

// Claude stuff
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2023-06-01";

// Gemini handler
importScripts("../lib/gemini-api.js");

async function callClaudeAPI({
	apiKey,
	model,
	systemPrompt,
	userPrompt,
	temperature,
	maxTokens,
}) {
	try {
		const response = await fetch(CLAUDE_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": CLAUDE_API_VERSION,
				"anthropic-dangerous-direct-browser-access": "true",
			},
			body: JSON.stringify({
				model: model,
				max_tokens: maxTokens,
				temperature: temperature,
				system: systemPrompt,
				messages: [
					{
						role: "user",
						content: userPrompt,
					},
				],
			}),
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
			throw new Error("No content in API response");
		}
	} catch (error) {
		return { success: false, error: error.message };
	}
}

async function generateMainPost(params) {
	const {
		aiProvider = "claude",
		claudeApiKey,
		claudeModel,
		geminiApiKey,
		geminiModel,
		topic,
		courseName = "your course",
		requirements = "",
		teacherInstructions = "",
		sideInstructions = "",
		temperature,
		maxTokens,
	} = params;

	if (aiProvider === "gemini") {
		// Gemini prompt includes the current date
		const currentDate = new Date().toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		const prompt = `Date: ${currentDate}\nDiscussion Topic: ${topic}\n\n${
			teacherInstructions
				? `Teacher's Instructions:\n${teacherInstructions}\n`
				: ""
		}${
			requirements ? `Requirements: ${requirements}\n` : ""
		}Generate a thoughtful discussion post that:\n- Demonstrates understanding of the topic\n- Uses conversational tone (not overly formal/AI-like)\n- Leaves room for personal touches and examples\n- ${
			requirements
				? "Meets the stated requirements"
				: "Is substantive and engaging"
		}\n\nProvide only the post content, no meta-commentary.`;
		const response = await GeminiAPI.generateContent({
			apiKey: geminiApiKey,
			model: geminiModel,
			prompt,
			temperature:
				typeof params.temperature === "number" ? params.temperature : undefined,
			maxTokens:
				typeof params.maxTokens === "number" ? params.maxTokens : undefined,
			systemInstruction: params.sideInstructions || undefined,
			thinkingBudget:
				typeof params.thinkingBudget === "number"
					? params.thinkingBudget
					: undefined,
		});
		let text = "";
		if (
			response &&
			response.candidates &&
			response.candidates[0]?.content?.parts?.[0]?.text
		) {
			text = response.candidates[0].content.parts[0].text;
		} else {
			text = "No content in Gemini response";
		}
		return { success: true, text };
	} else {
		const systemPrompt = `You are a student in a ${courseName} course responding to a discussion prompt. Generate content that will be edited by the student, so keep it natural and conversational.${
			sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ""
		}`;
		const userPrompt = `Discussion Topic: ${topic}\n\n${
			teacherInstructions
				? `Teacher's Instructions:\n${teacherInstructions}\n`
				: ""
		}${
			requirements ? `Requirements: ${requirements}\n` : ""
		}Generate a thoughtful discussion post that:\n- Demonstrates understanding of the topic\n- Follows the teacher's instructions and requirements\n- Uses conversational tone (not overly formal/AI-like)\n- Leaves room for personal touches and examples\n- ${
			requirements
				? "Meets the stated requirements"
				: "Is substantive and engaging"
		}\n\nProvide only the post content, no meta-commentary.`;
		return await callClaudeAPI({
			...params,
			apiKey: claudeApiKey,
			model: claudeModel,
			systemPrompt,
			userPrompt,
			temperature,
			maxTokens,
		});
	}
}

async function generateReply(params) {
	const {
		aiProvider = "claude",
		claudeApiKey,
		claudeModel,
		geminiApiKey,
		geminiModel,
		originalPost,
		authorName = "your classmate",
		topic,
		sideInstructions = "",
		temperature,
		maxTokens,
	} = params;

	if (aiProvider === "gemini") {
		const currentDate = new Date().toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		const prompt = `Date: ${currentDate}\nDiscussion Topic: ${topic}\n\n${authorName}'s Post:\n${originalPost}\n\nGenerate a constructive reply that:\n- Engages with their ideas\n- Uses natural, student-like language\n- Asks questions or adds insights\n- Avoids overly formal\n- Is friendly and respectful\n- Keeps out common tropes like "It's not just X... it's Y..." or those suspiciously beautiful lists of three\n\nProvide only the reply content, no meta-commentary.`;
		const response = await GeminiAPI.generateContent({
			apiKey: geminiApiKey,
			model: geminiModel,
			prompt,
			temperature:
				typeof params.temperature === "number" ? params.temperature : undefined,
			maxTokens:
				typeof params.maxTokens === "number" ? params.maxTokens : undefined,
			systemInstruction: params.sideInstructions || undefined,
			thinkingBudget:
				typeof params.thinkingBudget === "number"
					? params.thinkingBudget
					: undefined,
		});
		let text = "";
		if (
			response &&
			response.candidates &&
			response.candidates[0]?.content?.parts?.[0]?.text
		) {
			text = response.candidates[0].content.parts[0].text;
		} else {
			text = "No content in Gemini response";
		}
		return { success: true, text };
	} else {
		const systemPrompt = `You are a student responding to a classmate's discussion post. This will be edited before posting, so keep it genuine and conversational.${
			sideInstructions ? `\n\nAdditional instructions: ${sideInstructions}` : ""
		}`;
		const userPrompt = `Discussion Topic: ${topic}\n\n${authorName}'s Post:\n${originalPost}\n\nGenerate a constructive reply that:\n- Engages with their ideas\n- Uses natural, student-like language\n- Asks questions or adds insights\n- Avoids overly formal\n- Is friendly and respectful\n- Keeps out common tropes like "It's not just X... it's Y..." or those suspiciously beautiful lists of three\n\nProvide only the reply content, no meta-commentary.`;
		return await callClaudeAPI({
			...params,
			apiKey: claudeApiKey,
			model: claudeModel,
			systemPrompt,
			userPrompt,
			temperature,
			maxTokens,
		});
	}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "openSettings") {
		chrome.runtime.openOptionsPage();
		return true;
	}

	if (message.action === "generateMainPost") {
		generateMainPost(message.params).then(sendResponse);
		return true; // Keep channel open for async response
	}

	if (message.action === "generateReply") {
		generateReply(message.params).then(sendResponse);
		return true; // Keep channel open for async response
	}
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === "install") {
		chrome.runtime.openOptionsPage();
	}
});
