## 1. Branch & Repository Prep

- [x] 1.1 Create and check out branch `ci/setup` from the current `main` (verify with `git branch --show-current` that the active branch is `ci/setup` and that `main` is untouched)
- [x] 1.2 Confirm the working tree is clean (`git status` shows no unrelated modifications) so the new commits contain only CI-related changes
- [x] 1.3 Confirm `package-lock.json` is committed and in sync with `package.json` by running `npm ci` successfully (verify: install completes with no lockfile rewrite and `git status` shows no change to `package-lock.json`)

## 2. Package Scripts

- [x] 2.1 Add `"typecheck": "tsc --noEmit"` to the `scripts` block in `package.json` (verify: `npm run typecheck` is listed by `npm run` and exits 0 on the current codebase)
- [x] 2.2 Confirm `test` (`vitest run`) and `build` (`tsc -b && vite build`) scripts remain untouched and no `lint` script is added, since no linter is configured in this repo (verify: `package.json` diff shows only the added `typecheck` line)
- [x] 2.3 Run `git rm --cached tsconfig.tsbuildinfo` and add `tsconfig.tsbuildinfo` to `.gitignore` (verify: `git status` shows the file as deleted/staged for removal and ignored, and the file still exists on disk locally)

## 3. GitHub Actions Workflow

- [x] 3.1 Create `.github/workflows/ci.yml` with triggers `pull_request` and `push` on `main`, top-level `permissions: contents: read`, and a `concurrency` group keyed on workflow + ref with `cancel-in-progress: true` (verify: YAML parses and contains all four keys)
- [x] 3.2 Add the `frontend` job: `actions/checkout@v4` → `actions/setup-node@v4` (Node 22, `cache: npm`) → `npm ci` → steps running `npm run typecheck`, then `npm run test`, then `npm run build`, in that order, with the package directory as the working directory (verify: step order in the file is typecheck → test → build)
- [x] 3.3 Add job-level `env:` with dummy values `VITE_BASE_URL=http://localhost:5173` and `VITE_API_BASE_URL=http://localhost:3000`, and no `secrets.*` references anywhere in the file (verify: a repo-wide search of the workflow for `secrets.` returns no matches)
- [x] 3.4 Add the aggregate job `ci-success` with `needs: [frontend]`, `if: always()`, and a failure condition when the needed job did not succeed (verify: the job name is exactly `ci-success` and it runs even when `frontend` fails)
- [x] 3.5 Confirm the workflow contains no deploy step, no platform CLI, and no end-to-end test command (verify: the file does not mention `vercel`, `render`, `playwright`, or `test:e2e`)

## 4. Local Verification

- [x] 4.1 Run `npm ci` from a clean state and verify it succeeds without modifying `package-lock.json`
- [x] 4.2 Run `npm run typecheck` and verify it exits 0 and reports type errors if any are introduced (verify: exit code 0 on the current codebase)
- [x] 4.3 Run `npm run test` and verify the Vitest suite passes in non-watch mode with the `e2e/**` specs excluded (verify: the run terminates on its own and exits 0)
- [x] 4.4 Run `npm run build` and verify the production bundle is produced in `dist/` and exits 0
- [x] 4.5 Parse `.github/workflows/ci.yml` with a YAML parser (e.g. `npx yaml-lint` or `node -e "require('yaml').parse(...)"`) and verify it reports no syntax errors
- [x] 4.6 Cross-check every npm command referenced in the workflow against `package.json` and verify each one exists as a script (verify: no workflow step references a missing script)
- [x] 4.7 Fix the pre-existing wall-clock-dependent failure in `src/components/CalendarToolbar.test.tsx` (discovered in 4.3: the component's `minDate={new Date()}` disabled every day of the fixture month, so the test was already red before this change) by freezing the clock inside that single test, without skipping or weakening any assertion (verify: the file's 9 tests pass and the full suite reports 171/171 passing)

## 5. Documentation

- [ ] 5.1 Update `AGENTS.md` to document the new `typecheck` script, the CI workflow, and the `ci-success` required status check (verify: the commands section mentions `npm run typecheck` and the CI gate)
- [ ] 5.2 Add a short note in `AGENTS.md` that no lint step exists because no linter is configured (verify: the note is present and consistent with the actual `package.json`)

## 6. Commit

- [ ] 6.1 Commit the script and artifact changes as `chore: add typecheck script and untrack build artifact` (verify: `git log --oneline -1` shows the commit and only the intended files are staged)
- [ ] 6.2 Commit the workflow as `ci: add GitHub Actions workflow for frontend` (verify: `git log --oneline -1` shows the commit and `.github/workflows/ci.yml` is the only file in it)
- [ ] 6.3 Commit the documentation update as `docs: document CI pipeline` (verify: `git log --oneline -3` shows the three logical commits and `git status` is clean)
- [ ] 6.4 Do NOT push; report the branch name and the push command (`git push -u origin ci/setup`) for the user to run manually

## 7. Final Report

- [ ] 7.1 Write the final report in Indonesian with the sections: Temuan repo, Perubahan, Hasil verifikasi, Asumsi & hal yang dilewati, and Langkah manual untuk saya (branch protection requiring `ci-success`, Vercel production branch confirmation, and any env/secrets to add)
- [ ] 7.2 Explicitly list the gaps: no linter configured so no lint step, `e2e/` not type-checked or tested in CI, no backend CI (separate repo), and the manual branch-protection step that cannot be automated from the repo
