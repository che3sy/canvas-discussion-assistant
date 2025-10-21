# Canvas Discussion Assistant
A DOM scraper browser add-on for Canvas discussions that generates new posts and replies based on pre-existing ones.

## Features
- Generates (given) n number of discussion replies to random posts (n>=0)
- Recently generated posts+reply sets will be saved. They can be viewed and deleted in the configuration popup.
- Automatically searches for teacher defined requirements (e.g word count, character account)

### Planned Features & Reworks
- Multi-page support
- Ability to copy individual replies from history
- UI Rework

# Temporary Installation (Source)
This add-on should be compatible with both Firefox and Chrome based browsers.agdad

## Firefox Based
1. `git clone https://github.com/chedsapp/canvas-discussion-assistant`.
2. Navigate to `about:debugging`.
3. Open the "This Firefox" menu.
4. Hit `Load Temporary Add-on...`. This opens a file selector window.
5. Navigate to the repository's directory.
6. Select `manifest.json` and hit open.

## Chrome Based
I didn't make the chrome compatibility so idk