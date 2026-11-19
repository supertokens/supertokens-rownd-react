# Releasing the npm packages

1. Configure the `npm-release` GitHub environment. Restrict deployments to `main`
   and add an `NPM_TOKEN` secret: a granular npm token with publish access to
   `@supertokens/rownd-react` and `@supertokens/rownd-nextjs` and Bypass 2FA enabled.
   The workflow's GitHub token must also be allowed to push the release commit
   and tag.
2. Bump `version` in the root `package.json` to a new stable version (for
   example, `0.2.3`) and merge the change to `main`. The workflow updates the
   lockfile and both package manifests to match.
3. In **Actions → Release npm packages → Run workflow**, select `main` and run
   it. No version input is needed.

The workflow tests and builds the SDKs, then uses `release-it` to commit the
version bump, create the Git tag and GitHub release, and publish both packages
to npm. If publishing fails after the tag is pushed, check which packages
published before retrying; rerunning with the same version will be rejected.

GitHub releases created with the workflow's `GITHUB_TOKEN` do not trigger the
separate Slack notification workflow.
