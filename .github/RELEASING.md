# Releasing the npm packages

1. Restrict the `npm-release` GitHub environment to `main`. The workflow's
   GitHub token must be allowed to push the release commit and tag.
2. In the npm settings for both `@supertokens/rownd-react` and
   `@supertokens/rownd-nextjs`, add a [GitHub Actions trusted publisher](https://docs.npmjs.com/trusted-publishers):
   organization `supertokens`, repository `supertokens-rownd-react`, workflow
   filename `release.yml`, environment `npm-release`. Enable direct
   `npm publish`. Each new configuration must publish successfully within two
   days. No `NPM_TOKEN` secret is needed.
3. Bump `version` in the root `package.json` to a new stable version (for
   example, `0.2.3`) and merge the change to `main`. The workflow updates the
   lockfile and both package manifests to match.
4. In **Actions → Release npm packages → Run workflow**, select `main` and run
   it. No version input is needed.

The workflow tests and builds the SDKs, then uses `release-it` to commit the
version bump, create the Git tag and GitHub release, and publish both packages
to npm.

## Recover a failed npm publish

If publishing fails after the tag is pushed, fix the npm publishing issue and
start a **new** run on `main` with **Publish missing packages from the existing
tag for the root package.json version** (`publish_only`) checked. Do not bump
the version. This mode builds from the matching tag, which must be the latest
stable tag and reachable from `main`. It skips packages already published at
that version and does not create or change commits, tags, or GitHub releases.

GitHub releases created with the workflow's `GITHUB_TOKEN` do not trigger the
separate Slack notification workflow.
