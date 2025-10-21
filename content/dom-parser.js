// DOM Parser for discussions

const CanvasParser = {
	getDiscussionTopic() {
		// I didn't know what the selectors for the title were and now im too lazy to get rid of these
		const selectors = [
			"h1.discussion-title",
			'h1[data-testid="discussion-topic-title"]',
			".discussion-title",
			".discussion_topic h1",
			"h1",
			'[role="heading"][aria-level="1"]',
		];

		for (const selector of selectors) {
			const element = document.querySelector(selector);
			if (element && element.textContent.trim()) {
				return element.textContent.trim();
			}
		}

		return null;
	},

	getTeacherInstructions() {
		const specificSelector =
			'span.user_content.enhanced[data-resource-type="discussion_topic.body"]';
		let element = document.querySelector(specificSelector);

		if (element && element.textContent.trim().length > 50) {
			return element.textContent.trim();
		}

		// Possible fallback selectors
		const selectors = [
			".userMessage .user_content.enhanced",
			".discussion-topic .user_content",
			"span.user_content.enhanced",
			".user_content",
			".message.user_content",
			'[data-testid="topic-message"]',
		];

		for (const selector of selectors) {
			element = document.querySelector(selector);
			if (element && element.textContent.trim().length > 50) {
				return element.textContent.trim();
			}
		}

		// New Canvas layout fallback: look for a post body inside a container with data-testid="discussion-topic-container"
		const topicContainer = document.querySelector(
			'[data-testid="discussion-topic-container"]'
		);
		if (topicContainer) {
			// Look for a span or div with data-resource-type="discussion_topic.body" inside
			const newBody = topicContainer.querySelector(
				'[data-resource-type="discussion_topic.body"]'
			);
			if (newBody && newBody.textContent.trim().length > 10) {
				return newBody.textContent.trim();
			}
		}

		return null;
	},

	getRequirements() {
		const requirements = [];

		// Look for word count requirements
		const bodyText = document.body.textContent;
		const wordCountMatch = bodyText.match(/(\d+)\s*words?/i);
		if (wordCountMatch) {
			requirements.push(`${wordCountMatch[1]} words`);
		}

		// Look for other common requirements
		if (bodyText.match(/citation|reference|source/i)) {
			requirements.push("Include citations/sources");
		}

		return requirements.join(", ");
	},

	getCourseName() {
		const breadcrumb = document.querySelector("#breadcrumbs");
		if (breadcrumb) {
			const courseLink = breadcrumb.querySelector('a[href*="/courses/"]');
			if (courseLink) {
				return courseLink.textContent.trim();
			}
		}

		// Fallback to generic
		return "your course";
	},

	getStudentPosts() {
		const posts = [];

		const entryElements = document.querySelectorAll("[data-entry-id]");

		entryElements.forEach((element, index) => {
			const authorNameElement = element.querySelector(
				'[data-testid="author_name"]'
			);
			let author = `student ${index + 1}`;

			if (authorNameElement) {
				const authorSpan = authorNameElement.querySelector(
					"span.user_content.enhanced, a span.user_content.enhanced"
				);
				if (authorSpan) {
					author = authorSpan.textContent.trim();
				} else {
					author = authorNameElement.textContent.trim();
				}
			}

			// Extract post content from .userMessage .user_content.enhanced
			const contentElement = element.querySelector(
				'.userMessage .user_content.enhanced[data-resource-type="discussion_topic.reply"]'
			);
			let content = "";

			if (contentElement) {
				content = contentElement.textContent.trim();
			} else {
				// Fallback to any .user_content.enhanced in the post
				const fallbackContent = element.querySelector(".user_content.enhanced");
				if (fallbackContent) {
					content = fallbackContent.textContent.trim();
				}
			}

			// Only add if we have content and it's not the teacher's main post
			if (content && content.length > 10) {
				// Skip if this looks like the main topic post (has data-resource-type="discussion_topic.body")
				const isMainTopic = element.querySelector(
					'[data-resource-type="discussion_topic.body"]'
				);
				if (!isMainTopic) {
					posts.push({
						author,
						content,
						element,
						index,
					});
				}
			}
		});

		return posts;
	},

	getRandomPosts(count) {
		const allPosts = this.getStudentPosts();

		if (allPosts.length === 0) {
			return [];
		}

		if (allPosts.length <= count) {
			return allPosts;
		}

		const shuffled = [...allPosts].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	},

	isDiscussionPage() {
		return window.location.href.includes("/discussion_topics/");
	},

	getAllData(replyCount = 3) {
		return {
			topic: this.getDiscussionTopic(),
			teacherInstructions: this.getTeacherInstructions(),
			requirements: this.getRequirements(),
			courseName: this.getCourseName(),
			postsForReply: this.getRandomPosts(replyCount),
			totalPosts: this.getStudentPosts().length,
		};
	},
};

if (typeof module !== "undefined" && module.exports) {
	module.exports = CanvasParser;
}
