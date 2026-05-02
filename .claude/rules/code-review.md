# Code Review Rules
> Source of truth for code-review.js hook. Edit thresholds and patterns here.

## Thresholds
Entries are `name: number` — parsed as integers by the hook.

- max function lines: 50
- max file lines: 800
- max nesting depth: 4
- max parameters: 5
- max consecutive blank lines: 3
- max line length: 120

## Naming Conventions
Rules the hook checks with heuristic pattern matching.

- functions_camelCase: function declarations and arrow function assignments must start with a lowercase letter
- classes_PascalCase: class declarations must start with an uppercase letter
- constants_UPPER_SNAKE: variables declared with const and ALL_CAPS are the canonical style for module-level constants
- boolean_prefix: boolean variables should start with is, has, can, should, will, or needs
- handler_prefix: event handlers should start with handle or on
- no_single_letter_vars: single-letter variable names (except i, j, k, x, y, n, e, t) are forbidden outside for-loops

## Forbidden Patterns
Entries are `name: regex_string` — matched line-by-line against file content.

- console_log: console\.log\(
- console_debug: console\.debug\(
- console_info_prod: console\.info\(
- debugger_stmt: \bdebugger\b
- empty_catch: catch\s*\([^)]*\)\s*\{\s*\}
- magic_number: (?<!['\"\w.])(?<!\.)\b(?!0\b|1\b|2\b|0\.5\b|100\b)\d{2,}\b(?!['\"px%remvh])
- nested_ternary: \?\s*[^:\n]{3,}\?\s*[^:\n]+:
- alert_call: \balert\s*\(
- infinite_loop: while\s*\(\s*true\s*\)
- no_explicit_any_cast: as\s+any\b

## Complexity Signals
Informational warnings — do not block, but are printed alongside violations.

- long_method_chain: \.\w+\([^)]*\)\.\w+\([^)]*\)\.\w+\([^)]*\)\.\w+\(
- deeply_nested_callbacks: function[^{]+\{[^}]+function[^{]+\{[^}]+function[^{]+\{
- large_object_literal: suggests extracting inline objects with more than 10 keys to a config file
- multiple_returns: functions with more than 5 return statements are hard to follow
