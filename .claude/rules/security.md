# Security Rules
> Source of truth for security.js hook. Edit patterns here to update enforcement.

## Forbidden Patterns
Entries are `name: regex_string` — the hook converts values to RegExp at runtime.

- openai_key: sk-[a-zA-Z0-9]{20,}
- anthropic_key: sk-ant-[a-zA-Z0-9\-]{30,}
- anthropic_key_v3: sk-ant-api03-[a-zA-Z0-9\-_]{90,}
- google_api_key: AIza[0-9A-Za-z\-_]{35}
- github_token: ghp_[a-zA-Z0-9]{36}
- github_pat: github_pat_[a-zA-Z0-9_]{80,}
- aws_access_key: AKIA[0-9A-Z]{16}
- aws_secret_key: (?i)aws.{0,20}secret.{0,20}['\"][0-9a-zA-Z/+]{40}['\"]
- stripe_live_key: sk_live_[a-zA-Z0-9]{24,}
- stripe_test_key: sk_test_[a-zA-Z0-9]{24,}
- jwt_secret_literal: (jwt|JWT)(_?secret|_?SECRET)\s*[=:]\s*['"][^'"${\s]{8,}['"]
- password_literal: (?i)password\s*[=:]\s*['"][^'"${\s]{4,}['"]
- secret_literal: (?i)(?:^|[^a-z])secret\s*[=:]\s*['"][^'"${\s]{4,}['"]
- private_key_header: -----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE KEY-----
- db_url_with_creds: (postgres|mysql|mongodb|redis):\/\/[^:@\s]+:[^@\s]{4,}@

## Allowed Exceptions
Patterns that disqualify a match — if a forbidden match line also matches an exception, skip it.

- env_var_ref: process\.env\.[A-Z_][A-Z0-9_]*
- template_literal_env: \$\{process\.env\.[A-Z_]
- example_file_suffix: \.(example|sample|template)$
- placeholder_value: (your[_\-]?(key|secret|token|password)[_\-]?here|<[A-Z_]+>|INSERT_HERE|REPLACE_ME|changeme|change.me|xxx+|placeholder|REDACTED)
- test_file_pattern: \.(test|spec)\.(ts|js|tsx|jsx)$
- mock_value: (mock|stub|fake|dummy)[_\-]?(key|secret|token)

## Severity Levels
Comma-separated pattern names per severity tier.

- CRITICAL: openai_key, anthropic_key, anthropic_key_v3, google_api_key, github_token, github_pat, aws_access_key, aws_secret_key, stripe_live_key, private_key_header, db_url_with_creds
- HIGH: stripe_test_key, jwt_secret_literal, password_literal, secret_literal
- LOW: any other pattern not listed above

## Scan Targets
Controls which files are scanned by the Stop hook.

- extensions: .ts, .tsx, .js, .jsx, .mjs, .cjs, .json, .yaml, .yml, .env, .sh
- skip_dirs: node_modules, .next, dist, .turbo, coverage, .git, prisma/migrations
- max_file_size_kb: 500
