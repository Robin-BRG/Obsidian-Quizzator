# Quizzator

An Obsidian plugin for creating and taking AI-powered interactive quizzes.

## Features

- **Multiple Question Types**: Free text, multiple choice (MCQ), sliders, and true/false questions
- **AI-Powered Evaluation**: Uses OpenAI, Anthropic, or local Ollama models to evaluate free-text answers
- **Flexible Scoring**: Configure pass/fail thresholds with an "imprecise" middle ground
- **Question Weighting**: Assign different weights to questions for custom scoring
- **Beautiful UI**: Clean, modern interface with real-time feedback
- **Two Launch Methods**:
  - Sidebar view to browse all quizzes
  - Inline buttons in any markdown file

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/quizzator/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Development mode with auto-rebuild
npm run dev
```

## Usage

### Creating a Quiz

Create a quiz using a `quiz` code block in any markdown file:

````markdown
```quiz
title: My Quiz Title
description: Optional description
scoring:
  min_score_to_pass: 80
  min_score_to_fail: 60

questions:
  - type: free-text
    q: What is the capital of France?
    answer: Paris
    weight: 1

  - type: mcq
    q: Which of these are programming languages?
    options:
      - Python
      - JavaScript
      - HTML
      - CSS
    answer:
      - Python
      - JavaScript
    multiple: true

  - type: slider
    q: In what year was JavaScript created?
    answer: 1995
    min: 1980
    max: 2010
    step: 1
    tolerance: 2

  - type: true-false
    q: TypeScript is a superset of JavaScript
    answer: true
```
````

### Launching Quizzes

**Method 1: Sidebar**
1. Click the Quizzator icon in the ribbon (left sidebar)
2. Browse available quizzes
3. Click on a quiz to launch it

**Method 2: Command Palette**
- Open command palette (Ctrl/Cmd + P)
- Search for "Launch quiz from current file"

**Method 3: Inline Button**
Add this code block to any note:

````markdown
```quiz-button
path: path/to/quiz-file.md
```
````

### Question Types

#### Free Text
```yaml
- type: free-text
  q: "Your question here"
  answer: "Expected answer"
  context: "Additional context for AI evaluation (optional)"
  weight: 1
```

The AI will evaluate the answer and provide a score (0-100), explanation, and the expected answer.

#### Multiple Choice (MCQ)
```yaml
- type: mcq
  q: "Your question here"
  options:
    - "Option A"
    - "Option B"
    - "Option C"
    - "Option D"
  answer: ["Option B"]  # Can be multiple for multi-select
  multiple: false       # Set to true for checkboxes
  weight: 1
```

**Scoring:**
- Single choice: 100 if correct, 0 if incorrect
- Multiple choice: Proportional score based on correct/incorrect selections

#### Slider
```yaml
- type: slider
  q: "Your question here"
  answer: 42
  min: 0
  max: 100
  step: 1              # Optional, default 1
  tolerance: 5         # Optional, ±5 accepted
  weight: 1
```

**Scoring:**
- With tolerance: 100 if within range, 0 otherwise
- Without tolerance: Must be exact (100 or 0)

#### True/False
```yaml
- type: true-false
  q: "Your statement here"
  answer: true
  weight: 1
```

**Scoring:** Binary (100 or 0)

### Scoring System

Each question receives a score from 0-100, which is then classified:
- **✓ Passed**: Score >= `min_score_to_pass`
- **~ Imprecise**: `min_score_to_fail` <= Score < `min_score_to_pass`
- **✗ Failed**: Score < `min_score_to_fail`

The final quiz score is calculated as:
```
Final Score = Σ(question_score × weight) / Σ(weight)
```

### Configuration

Go to Settings → Quizzator to configure:

**LLM Provider**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Ollama (Local models)

For each provider, you'll need to:
1. Select the provider
2. Enter your API key (or Ollama URL)
3. Choose the model

## Example Quiz

See [examples/sample-quiz.md](examples/sample-quiz.md) for a complete example.

## Tips

1. **Free-text questions**: Provide good context to help the AI evaluate answers accurately
2. **Question weights**: Use higher weights for more important questions
3. **Tolerance on sliders**: Useful for dates, measurements, or estimates
4. **MCQ multiple choice**: Great for "select all that apply" questions
5. **Scoring thresholds**: Adjust based on difficulty (harder quizzes might have lower pass thresholds)

## Troubleshooting

**"Failed to connect to LLM provider"**
- Check your API key in settings
- Verify your internet connection
- For Ollama: Ensure Ollama is running and accessible

**"No quiz found in this file"**
- Ensure your quiz is in a ` ```quiz ` code block
- Check that the YAML contains `title:`, `scoring:`, and `questions:`
- Validate YAML syntax (use a YAML validator)

**Questions not showing correctly**
- Verify required fields are present for each question type
- Check that `min` < `max` for slider questions
- Ensure MCQ `answer` is an array

## Development

Built with:
- TypeScript
- Obsidian API
- OpenAI SDK
- Anthropic SDK
- js-yaml

## License

MIT

## Support

Found a bug or have a feature request? Please open an issue on GitHub.

