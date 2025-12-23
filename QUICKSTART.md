# Quick Start Guide - Quizzator

## Installation Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the plugin**
   ```bash
   npm run build
   ```

3. **Install in Obsidian**
   - Copy the folder to your vault's `.obsidian/plugins/quizzator/`
   - Or create a symbolic link for development:
     ```bash
     # Windows (as Administrator)
     mklink /D "C:\path\to\vault\.obsidian\plugins\quizzator" "C:\Users\robin\Code\Obsidian_Plugin"

     # Mac/Linux
     ln -s /path/to/Obsidian_Plugin /path/to/vault/.obsidian/plugins/quizzator
     ```

4. **Enable the plugin**
   - Open Obsidian
   - Go to Settings → Community plugins
   - Enable "Quizzator"

5. **Configure LLM Provider**
   - Go to Settings → Quizzator
   - Choose your LLM provider (OpenAI, Anthropic, or Ollama)
   - Enter your API key or Ollama URL

## Your First Quiz

Create a new note in your vault with this content:

```yaml
---
quiz:
  title: "My First Quiz"
  description: "A simple test quiz"
  scoring:
    min_score_to_pass: 80
    min_score_to_fail: 60
  questions:
    - type: true-false
      q: "Obsidian is a knowledge management tool"
      answer: true
      weight: 1

    - type: mcq
      q: "Which format does Obsidian use?"
      options:
        - "Markdown"
        - "HTML"
        - "PDF"
        - "Word"
      answer: ["Markdown"]
      multiple: false
      weight: 1

    - type: slider
      q: "Rate your Obsidian knowledge (1-10)"
      answer: 7
      min: 1
      max: 10
      tolerance: 2
      weight: 1
---

# My First Quiz

Launch this quiz from the Quizzator sidebar!
```

## Launch Your Quiz

**Option 1: Sidebar**
1. Click the list icon in the left ribbon
2. Find "My First Quiz"
3. Click to launch

**Option 2: Command**
1. Open the note with your quiz
2. Press `Ctrl/Cmd + P`
3. Type "Launch quiz from current file"
4. Press Enter

## Next Steps

- Check out [examples/sample-quiz.md](examples/sample-quiz.md) for a complete example
- Read the [README.md](README.md) for detailed documentation
- Experiment with different question types
- Adjust scoring thresholds to fit your needs

## Development Mode

For active development:

```bash
npm run dev
```

This will watch for changes and rebuild automatically. You'll need to reload Obsidian (Ctrl+R) to see changes.

## Common Issues

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Plugin not showing:**
- Make sure files are in the correct directory
- Check that `manifest.json` exists in the plugin folder
- Reload Obsidian (Ctrl+R)

**LLM errors:**
- Verify API key is correct
- Check internet connection
- For Ollama: ensure it's running (`ollama serve`)

Enjoy using Quizzator! 🎯
