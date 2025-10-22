// Cross-browser compatibility
const browser = globalThis.browser || globalThis.chrome;

// Help dropdown toggle for CSP compliance
document.addEventListener("DOMContentLoaded", function () {
	const toggle = document.getElementById("howToUseToggle");
	const content = document.getElementById("howToUseContent");
	if (toggle && content) {
		toggle.addEventListener("click", function () {
			content.style.display =
				content.style.display === "none" ? "block" : "none";
		});
	}
});
const form = document.getElementById("settingsForm");
const statusBanner = document.getElementById("statusBanner");
const aiProviderSelect = document.getElementById("aiProvider");
const apiKeyInput = document.getElementById("apiKey");
const geminiApiKeyInput = document.getElementById("geminiApiKey");
const modelSelect = document.getElementById("model");
const geminiModelSelect = document.getElementById("geminiModel");
// We dont need replycoundt anymore
const temperatureInput = document.getElementById("temperature");
const temperatureValue = document.getElementById("temperatureValue");
const maxTokensInput = document.getElementById("maxTokens");
const sideInstructionsInput = document.getElementById("sideInstructions");
const claudeApiKeyGroup = document.getElementById("claudeApiKeyGroup");
const geminiApiKeyGroup = document.getElementById("geminiApiKeyGroup");
const modelGroup = document.getElementById("modelGroup");
const geminiModelGroup = document.getElementById("geminiModelGroup");

// Update temperature thingy
temperatureInput.addEventListener("input", (e) => {
	temperatureValue.textContent = e.target.value;
});

// Show/hide fields based on AI provider
aiProviderSelect.addEventListener("change", (e) => {
	if (aiProviderSelect.value === "claude") {
		claudeApiKeyGroup.style.display = "block";
		modelGroup.style.display = "block";
		geminiApiKeyGroup.style.display = "none";
		geminiModelGroup.style.display = "none";
	} else {
		claudeApiKeyGroup.style.display = "none";
		modelGroup.style.display = "none";
		geminiApiKeyGroup.style.display = "block";
		geminiModelGroup.style.display = "block";
	}
});

// Load saved settings on popup open
async function loadSettings() {
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

		aiProviderSelect.value = settings.aiProvider || "claude";
		if (settings.claudeApiKey) {
			apiKeyInput.value = settings.claudeApiKey;
		}
		if (settings.geminiApiKey) {
			geminiApiKeyInput.value = settings.geminiApiKey;
		}
		if (settings.claudeModel) {
			modelSelect.value = settings.claudeModel;
		}
		if (settings.geminiModel) {
			geminiModelSelect.value = settings.geminiModel;
		}
		if (settings.temperature !== undefined) {
			temperatureInput.value = settings.temperature;
			temperatureValue.textContent = settings.temperature;
		}
		if (settings.maxTokens) {
			maxTokensInput.value = settings.maxTokens;
		}
		if (settings.sideInstructions) {
			sideInstructionsInput.value = settings.sideInstructions;
		}

		// Trigger field visibility
		aiProviderSelect.dispatchEvent(new Event("change"));
	} catch (error) {
		showStatus("Error loading settings", "error");
	}
}

async function saveSettings(e) {
	e.preventDefault();

	const aiProvider = aiProviderSelect.value;
	let claudeApiKey = "";
	let claudeModel = "";
	let geminiApiKey = "";
	let geminiModel = "";

	if (aiProvider === "claude") {
		claudeApiKey = apiKeyInput.value.trim();
		claudeModel = modelSelect.value;
		if (!claudeApiKey) {
			showStatus("Claude API key is required", "error");
			return;
		}
		if (!claudeApiKey.startsWith("sk-ant-")) {
			showStatus(
				'Invalid Claude API key format. Should start with "sk-ant-"',
				"error"
			);
			return;
		}
	} else {
		geminiApiKey = geminiApiKeyInput.value.trim();
		geminiModel = geminiModelSelect.value;
		if (!geminiApiKey) {
			showStatus("Gemini API key is required", "error");
			return;
		}
		if (!geminiApiKey.startsWith("AIza")) {
			showStatus(
				'Invalid Gemini API key format. Should start with "AIza"',
				"error"
			);
			return;
		}
	}

	const settings = {
		aiProvider,
		claudeApiKey,
		claudeModel,
		geminiApiKey,
		geminiModel,
		temperature: parseFloat(temperatureInput.value),
		maxTokens: parseInt(maxTokensInput.value, 10),
		sideInstructions: sideInstructionsInput.value.trim(),
	};

	try {
		await browser.storage.local.set(settings);
		showStatus("settings saved successfully", "success");

		// Close popup after 1 second or something
		setTimeout(() => {
			window.close();
		}, 1000);
	} catch (error) {
		showStatus("error saving settings", "error");
	}
}

function showStatus(message, type) {
	statusBanner.textContent = message;
	statusBanner.className = `status-banner ${type}`;
	statusBanner.style.display = "block";

	if (type === "success") {
		setTimeout(() => {
			statusBanner.style.display = "none";
		}, 3000);
	}
}

// History
const toggleHistoryBtn = document.getElementById("toggleHistory");
const historyContent = document.getElementById("historyContent");

let historyVisible = false;

toggleHistoryBtn.addEventListener("click", () => {
	historyVisible = !historyVisible;
	if (historyVisible) {
		historyContent.style.display = "block";
		toggleHistoryBtn.textContent = "hide history";
		loadHistory();
	} else {
		historyContent.style.display = "none";
		toggleHistoryBtn.textContent = "show history";
	}
});

async function loadHistory() {
	try {
		const { postHistory } = await browser.storage.local.get("postHistory");
		const history = postHistory || [];

		if (history.length === 0) {
			historyContent.innerHTML =
				'<p class="empty-history">no posts generated yet</p>';
			return;
		}

		let html = '<ul class="history-list">';

		history.forEach((item, index) => {
			if (!item) return;
			const date = new Date(item.timestamp || Date.now());
			const topic = typeof item.topic === "string" ? item.topic : "untitled";
			const mainPost = typeof item.mainPost === "string" ? item.mainPost : "";
			const replies = Array.isArray(item.replies) ? item.replies : [];
			const timeStr = formatTime(date);

			const isMainPost = mainPost && mainPost.length > 0;
			const replyTo = !isMainPost && replies.length > 0 && replies[0].replyTo
				? replies[0].replyTo
				: null;

			const content = isMainPost ? mainPost : (replies[0]?.content || "");

			let replyLabel = isMainPost ? "main post" : (replyTo ? `reply to ${replyTo}` : "reply");

			html += `
				<li class="history-item">
					<div class="history-meta">
						<span class="history-type">${escapeHtml(replyLabel)}</span>
						<span class="history-separator">•</span>
						<span class="history-topic" title="${escapeHtml(topic)}">${escapeHtml(topic.substring(0, 40) + (topic.length > 40 ? "..." : ""))}</span>
						<span class="history-separator">•</span>
						<span class="history-time">${timeStr}</span>
					</div>
					<div class="history-actions">
						<button data-index="${index}" class="copy-text-btn">copy text</button>
						<button data-index="${index}" class="delete-btn">delete</button>
					</div>
				</li>
			`;
		});

		html += '</ul>';

		// Add clear all button
		html +=
			'<button id="clearHistoryBtn" class="btn btn-secondary" style="width: 100%; margin-top: 8px;">clear all history</button>';

		historyContent.innerHTML = html;

		document.querySelectorAll(".copy-text-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => copyHistoryText(e, history));
		});

		document.querySelectorAll(".delete-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => deleteHistoryItem(e));
		});

		document
			.getElementById("clearHistoryBtn")
			?.addEventListener("click", clearHistory);
	} catch (error) {
		historyContent.innerHTML =
			'<p class="empty-history">error loading history</p>';
	}
}

function formatTime(date) {
	const now = new Date();
	const diff = now - date;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return date.toLocaleDateString();
}

function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

async function copyHistoryText(e, history) {
	const index = parseInt(e.target.dataset.index);
	const item = history[index];

	const mainPost = typeof item.mainPost === "string" ? item.mainPost : "";
	const replies = Array.isArray(item.replies) ? item.replies : [];
	const content = mainPost && mainPost.length > 0
		? mainPost
		: (replies[0]?.content || "");

	try {
		await navigator.clipboard.writeText(content);
		e.target.textContent = "✓ copied";
		setTimeout(() => {
			e.target.textContent = "copy text";
		}, 2000);
	} catch (error) {
		// Silent fail
	}
}

async function deleteHistoryItem(e) {
	const index = parseInt(e.target.dataset.index);

	try {
		const { postHistory } = await browser.storage.local.get("postHistory");
		const history = postHistory || [];
		history.splice(index, 1);
		await browser.storage.local.set({ postHistory: history });
		loadHistory();
	} catch (error) {
		// Silent fail
	}
}

async function clearHistory() {
	if (
		confirm(
			"are you sure you want to clear all history? this cannot be undone."
		)
	) {
		try {
			await browser.storage.local.set({ postHistory: [] });
			loadHistory();
		} catch (error) {
			// Silent fail
		}
	}
}

// Event listeners
form.addEventListener("submit", saveSettings);

// Load settings when popup opens
loadSettings();

// Help dropdown toggle for CSP compliance, with arrow rotation
document.addEventListener("DOMContentLoaded", function () {
	const toggle = document.getElementById("howToUseToggle");
	const content = document.getElementById("howToUseContent");
	if (toggle && content) {
		toggle.addEventListener("click", function () {
			const expanded = toggle.getAttribute("aria-expanded") === "true";
			toggle.setAttribute("aria-expanded", !expanded);
			content.style.display = expanded ? "none" : "block";
		});
	}
});
