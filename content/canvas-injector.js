// UI handler + content script

(function () {
	"use strict";

	// Only run on discussion pages
	if (!window.location.href.includes("/discussion_topics/")) {
		return;
	}

	let overlayOpen = false;
	let generatedContent = null;

	function createFloatingButton() {
		if (document.getElementById("canvas-assistant-fab")) {
			return;
		}

		const fab = document.createElement("button");
		fab.id = "canvas-assistant-fab";
		fab.className = "canvas-assistant-fab";
		fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <span>generate content</span>
    `;

		fab.addEventListener("click", handleFabClick);
		document.body.appendChild(fab);
	}

	async function handleFabClick() {
		if (overlayOpen) {
			closeOverlay();
			return;
		}

		// Check if API key is configured
		const hasKey = await checkApiKey();
		if (!hasKey) {
			showApiKeyPrompt();
			return;
		}

		openOverlay();
	}

	async function checkApiKey() {
		try {
			if (!chrome.storage || !chrome.storage.local) {
				return false;
			}
			const { aiProvider, claudeApiKey, geminiApiKey } =
				await chrome.storage.local.get([
					"aiProvider",
					"claudeApiKey",
					"geminiApiKey",
				]);
			if (aiProvider === "gemini") {
				return !!geminiApiKey && geminiApiKey.length > 10;
			} else {
				return !!claudeApiKey && claudeApiKey.length > 10;
			}
		} catch (error) {
			return false;
		}
	}

	function showApiKeyPrompt() {
		if (!chrome.storage || !chrome.storage.local) {
			return;
		}
		chrome.storage.local.get(["aiProvider"], ({ aiProvider }) => {
			const message = document.createElement("div");
			message.className = "canvas-assistant-notification";
			let providerName = aiProvider === "gemini" ? "gemini" : "claude";
			message.innerHTML = `
								<div class="notification-content">
									<strong>api key required</strong>
									<p>please configure your ${providerName} api key in the extension settings.</p>
									<button id="openSettings">open settings</button>
								</div>
							`;
			document.body.appendChild(message);
			document.getElementById("openSettings").addEventListener("click", () => {
				try {
					chrome.runtime.sendMessage({ action: "openSettings" }, (res) => {
						if (chrome.runtime.lastError) {
							alert(
								"Extension context lost. Please refresh the page or reload the extension."
							);
						}
					});
				} catch (e) {
					alert(
						"Extension context lost. Please refresh the page or reload the extension."
					);
				}
				message.remove();
			});
			setTimeout(() => {
				message.remove();
			}, 5000);
		});
	}

	function openOverlay() {
		overlayOpen = true;

		const overlay = document.createElement("div");
		overlay.id = "canvas-assistant-overlay";
		overlay.innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-header">
          <h2>canvas discussion assistant</h2>
          <button class="close-btn" id="closeOverlay">&times;</button>
        </div>
        <div class="overlay-content" id="overlayContent">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>analyzing discussion and generating content...</p>
          </div>
        </div>
      </div>
    `;

		document.body.appendChild(overlay);

		document
			.getElementById("closeOverlay")
			.addEventListener("click", closeOverlay);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) {
				closeOverlay();
			}
		});

		generateContent();
	}

	function closeOverlay() {
		overlayOpen = false;
		const overlay = document.getElementById("canvas-assistant-overlay");
		if (overlay) {
			overlay.remove();
		}
	}

	async function generateContent() {
		try {
			const settings = await chrome.storage.local.get([
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

			// Parse discussion data
			const discussionData = CanvasParser.getAllData(settings.replyCount || 0);

			if (!discussionData.topic) {
				showError("could not find discussion topic on this page.");
				return;
			}

			// Generate main post via background script
			let mainPostResponse;
			try {
				mainPostResponse = await new Promise((resolve, reject) => {
					chrome.runtime.sendMessage(
						{
							action: "generateMainPost",
							params: {
								aiProvider: settings.aiProvider || "claude",
								claudeApiKey: settings.claudeApiKey,
								claudeModel:
									settings.claudeModel || "claude-3-5-sonnet-20240620",
								geminiApiKey: settings.geminiApiKey,
								geminiModel: settings.geminiModel || "gemini-2.5-pro",
								topic: discussionData.topic,
								teacherInstructions: discussionData.teacherInstructions,
								courseName: discussionData.courseName,
								requirements: discussionData.requirements,
								sideInstructions: settings.sideInstructions || "",
								temperature: settings.temperature ?? 0.7,
								maxTokens: settings.maxTokens ?? 1000,
							},
						},
						(response) => {
							if (chrome.runtime.lastError) {
								reject(
									new Error(
										"Extension context lost. Please refresh the page or reload the extension."
									)
								);
							} else {
								resolve(response);
							}
						}
					);
				});
			} catch (err) {
				showError(err.message);
				return;
			}

			if (!mainPostResponse.success) {
				throw new Error(
					mainPostResponse.error || "Failed to generate main post"
				);
			}

			const mainPost = mainPostResponse.text;

			// Generate replies via background script
			const replies = [];
			for (const post of discussionData.postsForReply) {
				let replyResponse;
				try {
					replyResponse = await new Promise((resolve, reject) => {
						chrome.runtime.sendMessage(
							{
								action: "generateReply",
								params: {
									aiProvider: settings.aiProvider || "claude",
									claudeApiKey: settings.claudeApiKey,
									claudeModel:
										settings.claudeModel || "claude-3-5-sonnet-20240620",
									geminiApiKey: settings.geminiApiKey,
									geminiModel: settings.geminiModel || "gemini-2.5-pro",
									originalPost: post.content,
									authorName: post.author,
									topic: discussionData.topic,
									sideInstructions: settings.sideInstructions || "",
									temperature: settings.temperature ?? 0.7,
									maxTokens: settings.maxTokens ?? 1000,
								},
							},
							(response) => {
								if (chrome.runtime.lastError) {
									reject(
										new Error(
											"Extension context lost. Please refresh the page or reload the extension."
										)
									);
								} else {
									resolve(response);
								}
							}
						);
					});
				} catch (err) {
					continue; // Skip this reply if extension context is lost
				}

				if (!replyResponse.success) {
					continue; // Skip this reply but continue with anything else that could be happening i guess idk
				}

				replies.push({
					content: replyResponse.text,
					replyTo: post.author,
				});
			}

			generatedContent = {
				mainPost,
				replies,
				discussionData,
			};

			// Save to history
			await saveToHistory({
				mainPost,
				replies,
				topic: discussionData.topic,
				timestamp: Date.now(),
			});

			displayContent();
		} catch (error) {
			showError(`Error generating content: ${error.message}`);
		}
	}

	function displayContent() {
		const contentDiv = document.getElementById("overlayContent");
		if (!contentDiv || !generatedContent) return;

		let html = '<div class="generated-content">';

		html += `
      <div class="content-section">
        <div class="section-header">
          <h3>main discussion post</h3>
          <button class="copy-btn" data-type="mainPost">copy to clipboard</button>
        </div>
        <div class="content-preview" id="mainPostPreview">${escapeHtml(
					generatedContent.mainPost
				)}</div>
      </div>
    `;

		if (generatedContent.replies && generatedContent.replies.length > 0) {
			generatedContent.replies.forEach((reply, index) => {
				html += `
          <div class="content-section">
            <div class="section-header">
              <h3>reply to ${escapeHtml(reply.replyTo)}</h3>
              <button class="copy-btn" data-type="reply" data-index="${index}">copy to clipboard</button>
            </div>
            <div class="content-preview" id="reply${index}Preview">${escapeHtml(
					reply.content
				)}</div>
          </div>
        `;
			});
		}

		html += `<div class="action-buttons">`;
		html += `<button class="btn btn-secondary" id="regenerateBtn">regenerate all</button>`;

		// Only show "Copy All" button if there are replies
		if (generatedContent.replies && generatedContent.replies.length > 0) {
			html += `<button class="btn btn-primary" id="copyAllBtn">copy all content</button>`;
		}

		html += `</div></div>`;

		contentDiv.innerHTML = html;

		document.querySelectorAll(".copy-btn").forEach((btn) => {
			btn.addEventListener("click", handleCopy);
		});

		document
			.getElementById("regenerateBtn")
			?.addEventListener("click", regenerateContent);
		document
			.getElementById("copyAllBtn")
			?.addEventListener("click", copyAllContent);
	}

	async function handleCopy(e) {
		const btn = e.target;
		const type = btn.dataset.type;
		const index = btn.dataset.index;

		let textToCopy = "";

		if (type === "mainPost") {
			textToCopy = generatedContent.mainPost;
		} else if (type === "reply") {
			textToCopy = generatedContent.replies[index].content;
		}

		try {
			await navigator.clipboard.writeText(textToCopy);
			showCopyFeedback(btn);
		} catch (error) {
			alert(
				"Failed to copy to clipboard. Please try selecting and copying manually."
			);
		}
	}

	async function copyAllContent() {
		let allText = `MAIN POST:\n${generatedContent.mainPost}\n\n`;

		if (generatedContent.replies && generatedContent.replies.length > 0) {
			generatedContent.replies.forEach((reply, index) => {
				allText += `REPLY ${index + 1} (to ${reply.replyTo}):\n${
					reply.content
				}\n\n`;
			});
		}

		try {
			await navigator.clipboard.writeText(allText);
			const btn = document.getElementById("copyAllBtn");
			showCopyFeedback(btn);
		} catch (error) {
			alert("Failed to copy to clipboard.");
		}
	}

	function showCopyFeedback(btn) {
		const originalText = btn.textContent;
		btn.textContent = "✓ Copied!";
		btn.classList.add("copied");

		setTimeout(() => {
			btn.textContent = originalText;
			btn.classList.remove("copied");
		}, 2000);
	}

	function regenerateContent() {
		const contentDiv = document.getElementById("overlayContent");
		contentDiv.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>regenerating content...</p>
      </div>
    `;
		generatedContent = null;
		generateContent();
	}

	function showError(message) {
		const contentDiv = document.getElementById("overlayContent");
		if (!contentDiv) return;

		contentDiv.innerHTML = `
      <div class="error-state">
        <p class="error-message">${escapeHtml(message)}</p>
        <button class="btn btn-primary" id="retryBtn">try again</button>
      </div>
    `;

		document.getElementById("retryBtn")?.addEventListener("click", () => {
			contentDiv.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>generating content...</p>
        </div>
      `;
			generateContent();
		});
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	async function saveToHistory(content) {
		try {
			const { postHistory } = await chrome.storage.local.get("postHistory");
			const history = postHistory || [];

			history.unshift(content);

			const trimmedHistory = history.slice(0, 20);

			await chrome.storage.local.set({ postHistory: trimmedHistory });
		} catch (error) {
			// History saving shouldn't blow everything up
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", createFloatingButton);
	} else {
		createFloatingButton();
	}
})();
