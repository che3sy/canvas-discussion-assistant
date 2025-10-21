# Canvas Discussion Assistant
A DOM scraper browser add-on for Canvas discussions that generates new posts and replies based on pre-existing ones.

---
<img width="239" height="422" alt="image" src="https://github.com/user-attachments/assets/fdef9035-8e56-4aa2-8b8d-13f9bc1c6fce" /> <img width="239" height="422" alt="image" src="https://github.com/user-attachments/assets/df5b51d4-a512-4208-b20b-738a7444d63b" />

## Details
- Generates (given) n number of discussion replies to random posts (n>=0)
- Recently generated posts+reply sets will be saved. They can be viewed and deleted in the configuration popup.
- Automatically searches for teacher defined requirements (e.g word count, character account)

### Planned Features & Reworks
- Multi-page support
- Ability to copy individual replies from history
- UI Rework

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
