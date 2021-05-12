# Contributing Guidelines

## New Release

1. Use a branch and PR targeting `master` (e.g. `devel`, `release/vM.m.p`, etc.)
1. Keep the PR description up-to-date as things get merged into it
1. Merge
1. `git checkout master && git pull && npm version vM.m.p && git push --tags`
1. Draft a new [release](https://github.com/iterative/cml/releases)
   - Copy the PR description to the release notes
