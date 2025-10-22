// UI handler + content script

(function () {
	"use strict";
	const browser = globalThis.browser || globalThis.chrome;

	// Only run on discussion pages
	if (!window.location.href.includes("/discussion_topics/")) {
		return;
	}

	let overlayOpen = false;
	let generatedContent = null;
	let observer = null;

	function init() {
		injectContextualButtons();

		// Catch whatever updates on the page
		setupMutationObserver();

		// Yeah bruh idek
		setTimeout(() => injectContextualButtons(), 1000);
		setTimeout(() => injectContextualButtons(), 2000);
		setTimeout(() => injectContextualButtons(), 3000);
	}

	function injectContextualButtons() {
		injectMainDiscussionButton();
		injectPostReplyButtons();
	}

	function injectMainDiscussionButton() {
		const mainReplyButton = document.querySelector(
			'button[data-testid="discussion-topic-reply"]'
		);

		if (!mainReplyButton) {
			return;
		}

		// Check if already done
		const existingMainButton = document.querySelector(
			'button[data-button-type="main"].canvas-assistant-generate-btn'
		);
		if (existingMainButton) {
			return;
		}

		const ourButton = createGenerateButton("main", null);

		const replyButtonContainer = mainReplyButton.closest('.discussion-topic-reply-button');
		const flexItem = replyButtonContainer ? replyButtonContainer.parentElement : null;

		if (flexItem && flexItem.parentElement) {
			// Canvas does a flexbox list
			const ourFlexItem = document.createElement("span");
			ourFlexItem.setAttribute("dir", "ltr");
			ourFlexItem.setAttribute("class", "css-1wbwcaw-view-flexItem");
			ourFlexItem.appendChild(ourButton);

			flexItem.parentElement.insertBefore(ourFlexItem, flexItem.nextSibling);
		}
	}

	function injectPostReplyButtons() {
		const topLevelPosts = CanvasParser.getTopLevelPosts();

		topLevelPosts.forEach((post) => {
			const postElement = post.element;
			const entryId = post.entryId;
			const replyButton = postElement.querySelector(
				'button[data-testid="threading-toolbar-reply"]'
			);

			if (!replyButton) {
				return;
			}

			// Check if already done
			const toolbar = replyButton.closest("ul");
			if (!toolbar) {
				return;
			}

			if (toolbar.querySelector(`[data-canvas-assistant-entry-id="${entryId}"]`)) {
				return;
			}
			const listItem = replyButton.closest("li");
			if (!listItem) {
				return;
			}

			const ourButton = createGenerateButton("post", entryId);

			const newListItem = document.createElement("li");
			if (listItem.className) {
				newListItem.setAttribute("class", listItem.className);
			}
			newListItem.setAttribute("dir", "ltr");
			newListItem.setAttribute("data-testid", "desktop-thread-tool");

			newListItem.appendChild(ourButton);

			// todo: actually copy from elements
			const delimiter = document.createElement("span");
			delimiter.setAttribute("class", "css-1gfdwuw-inlineListItem__delimiter");
			delimiter.setAttribute("aria-hidden", "true");
			newListItem.appendChild(delimiter);

			listItem.parentElement.insertBefore(newListItem, listItem.nextSibling);
		});
	}

	function createGenerateButton(type, entryId) {
		const span = document.createElement("span");
		span.setAttribute("dir", "ltr");
		span.setAttribute("class", "css-owgq4n-view");

		const innerSpan = document.createElement("span");
		innerSpan.setAttribute("dir", "ltr");
		innerSpan.setAttribute("class", "css-1ue5gfk-view");

		const button = document.createElement("button");
		button.setAttribute("dir", "ltr");
		button.setAttribute("type", "button");
		button.setAttribute("class", "css-1w1xonf-view--inlineBlock-link canvas-assistant-generate-btn");
		button.setAttribute("data-button-type", type);
		if (entryId) {
			button.setAttribute("data-canvas-assistant-entry-id", entryId);
		}

		const iconSpan = document.createElement("span");
		iconSpan.setAttribute("class", "css-732i71-icon");

		// AI gave me this icon so idk if i can even use it
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("name", "IconAI");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", "1em");
		svg.setAttribute("height", "1em");
		svg.setAttribute("fill", "none");
		svg.setAttribute("stroke", "currentColor");
		svg.setAttribute("stroke-width", "2");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("role", "presentation");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("class", "css-1xnn9jb-inlineSVG-svgIcon");

		const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path1.setAttribute("d", "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z");

		const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path2.setAttribute("d", "M19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z");

		svg.appendChild(path1);
		svg.appendChild(path2);
		iconSpan.appendChild(svg);

		const textContainer = document.createElement("span");

		const srSpan = document.createElement("span");
		srSpan.setAttribute("class", "css-r9cwls-screenReaderContent");
		srSpan.textContent =
			type === "main"
				? "Generate response to discussion"
				: "Generate reply to post";

		const visibleSpan = document.createElement("span");
		visibleSpan.setAttribute("aria-hidden", "true");

		const textSpan = document.createElement("span");
		textSpan.setAttribute("class", "css-g5lcut-text");
		textSpan.setAttribute("wrap", "normal");
		textSpan.setAttribute("letter-spacing", "normal");
		textSpan.textContent =
			type === "main" ? "Generate Response" : "Generate Reply";

		visibleSpan.appendChild(textSpan);
		textContainer.appendChild(srSpan);
		textContainer.appendChild(visibleSpan);

		button.appendChild(iconSpan);
		button.appendChild(textContainer);

		button.addEventListener("click", handleGenerateClick);

		innerSpan.appendChild(button);
		span.appendChild(innerSpan);

		return span;
	}

	async function handleGenerateClick(e) {
		e.preventDefault();
		e.stopPropagation();

		if (overlayOpen) {
			closeOverlay();
			return;
		}

		const button = e.currentTarget;
		const type = button.getAttribute("data-button-type");
		const entryId = button.getAttribute("data-canvas-assistant-entry-id");

		// Check if API key is configured
		const hasKey = await checkApiKey();
		if (!hasKey) {
			showApiKeyPrompt();
			return;
		}

		openOverlay();

		if (type === "main") {
			generateMainDiscussionResponse();
		} else {
			generatePostReply(entryId);
		}
	}

	async function checkApiKey() {
		try {
			if (!browser.storage || !browser.storage.local) {
				return false;
			}
			const { aiProvider, claudeApiKey, geminiApiKey } =
				await browser.storage.local.get([
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
		if (!browser.storage || !browser.storage.local) {
			return;
		}
		browser.storage.local.get(["aiProvider"], ({ aiProvider }) => {
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
					browser.runtime.sendMessage({ action: "openSettings" }, (res) => {
						if (browser.runtime.lastError) {
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
	}

	function closeOverlay() {
		overlayOpen = false;
		const overlay = document.getElementById("canvas-assistant-overlay");
		if (overlay) {
			overlay.remove();
		}
	}

	async function generateMainDiscussionResponse() {
		try {
			const settings = await browser.storage.local.get([
				"aiProvider",
				"claudeApiKey",
				"claudeModel",
				"geminiApiKey",
				"geminiModel",
				"temperature",
				"maxTokens",
				"sideInstructions",
			]);

			const context = CanvasParser.getMainDiscussionContext();

			if (!context.topic) {
				showError("could not find discussion topic on this page.");
				return;
			}

			let contextSummary = "";
			if (context.topLevelPosts.length > 0) {
				contextSummary =
					"\n\nExisting posts in this discussion:\n" +
					context.topLevelPosts
						.map((p, i) => `${i + 1}. ${p.author}: ${p.content.substring(0, 200)}...`)
						.join("\n");
			}

			// Generate main post via background script
			let mainPostResponse;
			try {
				mainPostResponse = await new Promise((resolve, reject) => {
					browser.runtime.sendMessage(
						{
							action: "generateMainPost",
							params: {
								aiProvider: settings.aiProvider || "claude",
								claudeApiKey: settings.claudeApiKey,
								claudeModel:
									settings.claudeModel || "claude-3-5-sonnet-20240620",
								geminiApiKey: settings.geminiApiKey,
								geminiModel: settings.geminiModel || "gemini-2.5-pro",
								topic: context.topic,
								teacherInstructions:
									context.teacherInstructions + contextSummary,
								courseName: context.courseName,
								requirements: context.requirements,
								sideInstructions: settings.sideInstructions || "",
								temperature: settings.temperature ?? 0.7,
								maxTokens: settings.maxTokens ?? 1000,
							},
						},
						(response) => {
							if (browser.runtime.lastError) {
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
					mainPostResponse.error || "Failed to generate response"
				);
			}

			generatedContent = {
				type: "main",
				content: mainPostResponse.text,
			};

			await saveToHistory({
				mainPost: mainPostResponse.text,
				replies: [],
				topic: context.topic,
				timestamp: Date.now(),
			});

			displayContent();
		} catch (error) {
			showError(`Error generating content: ${error.message}`);
		}
	}

	async function generatePostReply(entryId) {
		try {
			const settings = await browser.storage.local.get([
				"aiProvider",
				"claudeApiKey",
				"claudeModel",
				"geminiApiKey",
				"geminiModel",
				"temperature",
				"maxTokens",
				"sideInstructions",
			]);

			const context = CanvasParser.getPostContext(entryId);
			const mainContext = CanvasParser.getMainDiscussionContext();

			if (!context || !context.post) {
				showError("could not find the post to reply to.");
				return;
			}

			let fullContext = context.post.content;
			if (context.nestedReplies.length > 0) {
				fullContext +=
					"\n\nExisting replies to this post:\n" +
					context.nestedReplies
						.map((r) => `- ${r.author}: ${r.content}`)
						.join("\n");
			}

			let replyResponse;
			try {
				replyResponse = await new Promise((resolve, reject) => {
					browser.runtime.sendMessage(
						{
							action: "generateReply",
							params: {
								aiProvider: settings.aiProvider || "claude",
								claudeApiKey: settings.claudeApiKey,
								claudeModel:
									settings.claudeModel || "claude-3-5-sonnet-20240620",
								geminiApiKey: settings.geminiApiKey,
								geminiModel: settings.geminiModel || "gemini-2.5-pro",
								originalPost: fullContext,
								authorName: context.post.author,
								topic: mainContext.topic,
								sideInstructions: settings.sideInstructions || "",
								temperature: settings.temperature ?? 0.7,
								maxTokens: settings.maxTokens ?? 1000,
							},
						},
						(response) => {
							if (browser.runtime.lastError) {
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

			if (!replyResponse.success) {
				throw new Error(replyResponse.error || "Failed to generate reply");
			}

			generatedContent = {
				type: "reply",
				content: replyResponse.text,
				replyTo: context.post.author,
				entryId: entryId,
			};

			// Save to history
			await saveToHistory({
				mainPost: "",
				replies: [
					{
						content: replyResponse.text,
						replyTo: context.post.author,
					},
				],
				topic: mainContext.topic,
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

		if (generatedContent.type === "main") {
			html += `
        <div class="content-section">
          <div class="section-header">
            <h3>generated discussion post</h3>
            <button class="copy-btn" data-type="main">copy to clipboard</button>
          </div>
          <div class="content-preview">${escapeHtml(
						generatedContent.content
					)}</div>
        </div>
      `;
		} else {
			html += `
        <div class="content-section">
          <div class="section-header">
            <h3>generated reply to ${escapeHtml(generatedContent.replyTo)}</h3>
            <button class="copy-btn" data-type="reply">copy to clipboard</button>
          </div>
          <div class="content-preview">${escapeHtml(
						generatedContent.content
					)}</div>
        </div>
      `;
		}

		html += `
      <div class="action-buttons">
        <button class="btn btn-secondary" id="regenerateBtn">regenerate</button>
      </div>
    </div>`;

		contentDiv.innerHTML = html;

		document.querySelectorAll(".copy-btn").forEach((btn) => {
			btn.addEventListener("click", handleCopy);
		});

		document
			.getElementById("regenerateBtn")
			?.addEventListener("click", regenerateContent);
	}

	async function handleCopy(e) {
		const btn = e.target;
		const textToCopy = generatedContent.content;

		try {
			await navigator.clipboard.writeText(textToCopy);
			showCopyFeedback(btn);
		} catch (error) {
			alert(
				"Failed to copy to clipboard. Please try selecting and copying manually."
			);
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

		const type = generatedContent.type;
		const entryId = generatedContent.entryId;

		generatedContent = null;

		if (type === "main") {
			generateMainDiscussionResponse();
		} else if (entryId) {
			generatePostReply(entryId);
		} else {
			showError(
				"Please close and click the generate button again to regenerate."
			);
		}
	}

	function showError(message) {
		const contentDiv = document.getElementById("overlayContent");
		if (!contentDiv) return;

		contentDiv.innerHTML = `
      <div class="error-state">
        <p class="error-message">${escapeHtml(message)}</p>
        <button class="btn btn-primary" id="closeBtn">close</button>
      </div>
    `;

		document.getElementById("closeBtn")?.addEventListener("click", closeOverlay);
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	async function saveToHistory(content) {
		try {
			const { postHistory } = await browser.storage.local.get("postHistory");
			const history = postHistory || [];

			history.unshift(content);

			const trimmedHistory = history.slice(0, 20);

			await browser.storage.local.set({ postHistory: trimmedHistory });
		} catch (error) {
			// History saving shouldn't blow everything up
		}
	}

	function setupMutationObserver() {
		// Watch for new posts and stuff
		observer = new MutationObserver((mutations) => {
			let shouldReinject = false;

			for (const mutation of mutations) {
				if (mutation.addedNodes.length > 0) {
					for (const node of mutation.addedNodes) {
						if (node.nodeType === 1) {
							// Check for content appearing
							if (
								node.hasAttribute("data-entry-id") ||
								node.querySelector("[data-entry-id]") ||
								node.hasAttribute("data-testid") ||
								node.querySelector('[data-testid="discussion-topic-reply"]') ||
								node.querySelector('[data-testid="discussion-root-entry-container"]')
							) {
								shouldReinject = true;
								break;
							}
						}
					}
				}
				if (shouldReinject) break;
			}

			if (shouldReinject) {
				// Debounceeee
				clearTimeout(window.canvasAssistantReinjectTimeout);
				window.canvasAssistantReinjectTimeout = setTimeout(() => {
					injectContextualButtons();
				}, 500);
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	// Wait for dom
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
