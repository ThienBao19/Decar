# Coding Style Rules
> Source of truth for coding-style.js hook. Edit rules here to change enforcement.

## Immutability Rules
Direct mutation of arrays or objects is forbidden — always return new copies.

- no_array_push: \.push\(
- no_array_pop: \.pop\(\)
- no_array_splice: \.splice\(
- no_array_shift: \.shift\(\)
- no_array_unshift: \.unshift\(
- no_array_sort_inplace: (?<!\.\w{1,30})\bsort\(
- no_direct_property_mutation: (?<![=!<>])(?<!\bconst\s\w{1,40})\b\w+\.\w+\s*=\s*(?!null\b|undefined\b|true\b|false\b|new\s)
- no_object_assign_mutate: Object\.assign\s*\(\s*(?!{)\w
- no_delete_operator: \bdelete\s+\w+\.\w+

## Import Order
Imports must be ordered: (1) external packages, (2) internal @/ aliases, (3) relative ./
Blank line required between each group.

- external_before_internal: import from external packages must appear before @/ imports
- internal_before_relative: import from @/ paths must appear before ./ relative imports
- no_require_in_esm: \brequire\s*\(

## Formatting
Static formatting rules enforced by the hook.

- indent: 2
- quotes: single
- semicolons: false
- trailing_comma: all
- max_line_length: 100
- arrow_parens: always
- brace_style: 1tbs

## Forbidden
Patterns that are never allowed — entries are `name: regex_string`.

- var_keyword: \bvar\s+
- loose_equality: (?<![=!<>])={2}(?!=)
- strict_inequality_violation: (?<![=!<>])!=[^=]
- any_type: (?<!\/\/.*)\:\s*any\b
- ts_ignore: \/\/\s*@ts-ignore
- ts_nocheck: \/\/\s*@ts-nocheck
- eval_call: \beval\s*\(
- with_statement: \bwith\s*\(
- arguments_object: \barguments\b
- implicit_global: (?<!const |let |var |function |class |import )\b[a-z]\w+\s*=\s*(?!>)
- no_default_export_anonymous: export\s+default\s+(?:function|class)\s*\(
