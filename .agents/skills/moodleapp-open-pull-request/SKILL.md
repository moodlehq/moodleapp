---
name: moodleapp-open-pull-request
description: "Create a pull request to open source Moodle Mobile App repository with your changes"
---

# Open a pull request on Moodle App repository

This skill documents how the agent should create or rewrite a pull request for the Moodle Mobile App repository.

Key points:
- Prefer using Atlassian MCP (Jira) and GitHub MCP integrations when available.
- If integrations are not configured or accessible, fall back to safe behavior using branch and commit metadata.

## Prerequisites

- Atlassian MCP credentials configured for the agent (to fetch issue title/description).
- GitHub MCP credentials configured for PR creation/update.
- A local branch containing your changes. The branch name SHOULD include an issue key when applicable (e.g. `MOBILE-1234`).

## When to Use This Skill

- You have local changes and want the agent to open or rewrite a PR for `moodlehq/moodleapp`.

## Behavior and Steps

1. Detect the current branch name and look for an issue key pattern (e.g. `MOBILE-1234`).
2. Fetch the issue summary and description from Atlassian MCP using the issue key and use them to build the PR title and body.
3. Ensure the local branch is pushed to the fork (push to `origin` if it points to the user's fork). If the remote branch does not exist, push it and set upstream.
4. Build the PR title/body using:
   - PR title: `ISSUE-KEY: Short summary` (if issue key present) or `BRANCH_NAME: Short summary` otherwise.
   - PR body: `Link to issue:`, `Description:` (issue desc or latest commit message), and `Notes:` (reviewers suggestions).
   - If the branch contains more than one commit, collect all commits that are present on the branch but not yet in the upstream base (e.g. `upstream/main`) to provide a proper title and description.
5. Create or update a GitHub PR against the upstream repository (`moodlehq/moodleapp`) using the fork branch as the head and the repository's default branch (usually `main`) as base.
6. Optionally set the PR to draft, add reviewers and labels if available and requested by the user.


## Templates

- Title: `ISSUE-KEY: <one-line summary>` or `BRANCH_NAME: <one-line summary>`.
- Body example:

  Link to issue: `https://moodle.atlassian.net/browse/ISSUE-KEY`

  <Full issue description from MCP OR latest commit message(s)>

  Notes:
  - Add reviewers: @team-member

## Security & Permissions

- The agent will only attempt MCP or GitHub operations if credentials/integration are configured. If not, it will use the fallback behavior described above.

## Example Flows

- With MCP: branch `MOBILE-5007` → fetch Jira `MOBILE-5007` → use its title/description in PR.
- Without MCP: branch `MOBILE-5007` → use branch and commit messages to populate PR.
