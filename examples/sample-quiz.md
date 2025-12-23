---
quiz:
  title: "Web Development Fundamentals"
  description: "Test your knowledge of HTML, CSS, and JavaScript"
  scoring:
    min_score_to_pass: 75
    min_score_to_fail: 50
  questions:
    - type: free-text
      q: "Explain what the DOM (Document Object Model) is and why it's important in web development."
      answer: "The DOM is a programming interface for web documents. It represents the page structure as a tree of objects that can be manipulated with JavaScript."
      context: "The DOM allows programs to change document structure, style, and content dynamically"
      weight: 2

    - type: mcq
      q: "Which of the following are valid ways to include CSS in an HTML document?"
      options:
        - "Inline styles using the style attribute"
        - "Internal stylesheet using <style> tag"
        - "External stylesheet using <link> tag"
        - "Using JavaScript only"
      answer: ["Inline styles using the style attribute", "Internal stylesheet using <style> tag", "External stylesheet using <link> tag"]
      multiple: true
      weight: 1

    - type: slider
      q: "What is the default HTTP port number?"
      answer: 80
      min: 1
      max: 65535
      tolerance: 0
      weight: 1

    - type: true-false
      q: "JavaScript is a statically-typed language."
      answer: false
      weight: 1

    - type: mcq
      q: "Which HTTP method is used to retrieve data from a server?"
      options:
        - "GET"
        - "POST"
        - "PUT"
        - "DELETE"
      answer: ["GET"]
      multiple: false
      weight: 1

    - type: free-text
      q: "What is the difference between '==' and '===' in JavaScript?"
      answer: "'==' performs type coercion before comparison, while '===' checks both value and type without coercion"
      context: "Strict equality vs loose equality"
      weight: 2

    - type: slider
      q: "In what year was the first version of JavaScript released?"
      answer: 1995
      min: 1990
      max: 2000
      step: 1
      tolerance: 1
      weight: 1
---

# Web Development Quiz

This quiz covers fundamental concepts in web development including HTML, CSS, and JavaScript.

## Launch Quiz

You can launch this quiz by:
1. Opening the Quizzator sidebar and clicking on this quiz
2. Using the command palette: "Launch quiz from current file"
3. Clicking the button below

```quiz-button
path: examples/sample-quiz.md
```

## Topics Covered

- DOM manipulation
- CSS integration methods
- HTTP fundamentals
- JavaScript type system
- Equality operators

Good luck!
