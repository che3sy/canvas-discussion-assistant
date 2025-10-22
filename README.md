# Canvas Discussion Assistant
<img width="1187" height="112" alt="image" src="https://github.com/user-attachments/assets/68be45f0-eb0e-4226-8936-c294ae021fb0" />
<img width="671" height="142" alt="image" src="https://github.com/user-attachments/assets/bf0536f0-814d-4cc7-90ec-5e989128f60e" />

A browser add-on for Canvas discussions that generates new posts and replies for you.

Generating a discussion response scrapes the teacher instructions and any other responses currently loaded to the discussion.
Replying to a post scrapes the teacher instructions and any other pre-existing replies to the post.

## Features
- Adds new "Generate Response" and "Generate Reply" buttons for discussion boards.
- Recently generated replies will be saved. They can be viewed, copied, and deleted in the extension popup.
- Supports API usage for both Gemini and Claude.

# Temporary Installation (Source)
This add-on should be compatible with both Firefox and Chrome based browsers.

## Firefox Based
1. `git clone https://github.com/chedsapp/canvas-discussion-assistant`
2. Navigate to `about:debugging`
3. Open the "This Firefox" menu.
4. Hit `Load Temporary Add-on...`. This prompts you to select a file.
5. Navigate to the repository's directory.
6. Select `manifest.json`.

## Chrome Based
1. `git clone https://github.com/chedsapp/canvas-discussion-assistant`
2. Navigate to `chrome://extensions`
3. Enable the Developer mode toggle in the top-right corner.
4. Hit the `Load unpacked` button that appears on the left. This prompts you to select a directory.
5. Navigate to the repository's directory.
6. Select the entire parent directory. (the one containing `manifest.json`)
