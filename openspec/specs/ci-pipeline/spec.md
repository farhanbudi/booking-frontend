# ci-pipeline Specification

## Purpose

Defines the continuous-integration contract for the booking frontend repository: which automated checks run on pull requests and pushes to `main`, how the workflow is wired (triggers, permissions, concurrency, dependency install, environment handling), and the single aggregate status check that gates merges into `main`.

## Requirements

### Requirement: CI runs on pull requests and pushes to main

The repository SHALL contain a continuous-integration workflow that is triggered by every pull request and every push to the `main` branch. The workflow SHALL be stored in `.github/workflows/` as a YAML file and SHALL be executable by GitHub Actions without any manual dispatch step.

#### Scenario: Pull request triggers the workflow
- **WHEN** a pull request is opened or updated against the `main` branch
- **THEN** the CI workflow starts automatically for that pull request

#### Scenario: Push to main triggers the workflow
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the CI workflow starts automatically for that push

#### Scenario: Workflow definition is valid YAML
- **WHEN** the workflow file is parsed as YAML
- **THEN** the document parses without syntax errors and declares the expected top-level keys (`on`, `jobs`)

### Requirement: Workflow is scoped and safe by default

The CI workflow SHALL request read-only repository permissions (`contents: read`) and SHALL NOT declare write permissions, deploy credentials, or any secret values inline. The workflow SHALL define a concurrency group that is unique per workflow and per ref, with in-progress runs for the same ref cancelled automatically when a newer run starts.

#### Scenario: Read-only permissions
- **WHEN** the workflow's permissions are inspected
- **THEN** they resolve to read-only access to repository contents and grant no write scopes

#### Scenario: Duplicate runs are cancelled
- **WHEN** a new workflow run starts for a ref that already has a run in progress
- **THEN** the in-progress run for that ref is cancelled and only the newest run continues

#### Scenario: No secrets in the workflow definition
- **WHEN** the workflow file is inspected
- **THEN** it contains no hardcoded token, password, deploy-hook URL, or other credential value

### Requirement: Dependencies are installed reproducibly

The CI job SHALL install the frontend's dependencies from the committed lockfile using a deterministic install command, and SHALL NOT modify the lockfile during the run. The install SHALL be performed in the directory that contains the frontend `package.json`.

#### Scenario: Lockfile-faithful install
- **WHEN** the install step runs on a clean checkout
- **THEN** dependencies are installed from the committed lockfile and the lockfile is left unmodified

#### Scenario: Install step is scoped to the package directory
- **WHEN** the frontend package lives in a subdirectory of the repository
- **THEN** the install step executes with its working directory set to that subdirectory

### Requirement: Required quality checks run in order

The CI job SHALL run the frontend's typecheck, unit test, and build scripts, in that order, and SHALL fail the job if any of them fails. The CI job SHALL run only checks that exist as npm scripts in the frontend `package.json`; a check whose script is absent SHALL be skipped rather than approximated by an inline command.

#### Scenario: All checks pass
- **WHEN** typecheck, unit test, and build all succeed
- **THEN** the CI job reports success

#### Scenario: A check fails
- **WHEN** any one of the checks exits with a non-zero status
- **THEN** the CI job fails and the subsequent checks do not report success

#### Scenario: Absent script is skipped
- **WHEN** the frontend `package.json` does not define a script for a given check
- **THEN** that check is not executed and the workflow does not fail because of its absence

#### Scenario: Checks run in the documented order
- **WHEN** the CI job's step list is inspected
- **THEN** the typecheck step precedes the test step, and the test step precedes the build step

### Requirement: CI runs without real credentials or backend services

The CI job SHALL provide dummy values for the environment variables the frontend reads at build and test time, so that the pipeline never contacts a live backend and never depends on a real secret. The values SHALL be defined at job scope in the workflow definition, and SHALL NOT be sourced from repository secrets.

#### Scenario: Build succeeds with dummy environment
- **WHEN** the build step runs in CI with only dummy environment values set
- **THEN** the production bundle is produced successfully

#### Scenario: Tests succeed without a backend
- **WHEN** the unit test step runs in CI with no backend service available
- **THEN** the unit test suite passes without requiring network access to an API server

### Requirement: A single aggregate status check gates merges

The workflow SHALL define a final job named `ci-success` that depends on all other jobs in the workflow, that always runs even when a dependency failed or was cancelled, and that fails whenever any dependency did not succeed. This job SHALL be the only status check that needs to be required for merging into `main`.

#### Scenario: All dependencies succeed
- **WHEN** every job the aggregate job depends on completed successfully
- **THEN** the `ci-success` job completes successfully

#### Scenario: A dependency fails
- **WHEN** a job the aggregate job depends on failed
- **THEN** the `ci-success` job fails even though it ran

#### Scenario: A dependency was cancelled
- **WHEN** a job the aggregate job depends on was cancelled
- **THEN** the `ci-success` job fails

#### Scenario: Aggregate job always runs
- **WHEN** the workflow run reaches the aggregate job
- **THEN** the aggregate job is executed regardless of the outcome of the jobs it depends on

#### Scenario: Check name is stable
- **WHEN** a branch protection rule requires the CI status check
- **THEN** the required check name is exactly `ci-success`, matching the aggregate job's name

### Requirement: End-to-end tests are excluded from CI

The CI workflow SHALL NOT execute the end-to-end test suite, which requires a live backend and browser binaries. The CI unit test step SHALL run only the unit/component test suite.

#### Scenario: E2E suite is not invoked
- **WHEN** the CI job's executed commands are inspected
- **THEN** no end-to-end test command is executed

#### Scenario: Unit test step excludes end-to-end specs
- **WHEN** the unit test command runs in CI
- **THEN** the end-to-end spec files are not collected by the unit test runner

### Requirement: Deployment configuration is out of scope

The CI workflow SHALL NOT contain deployment logic, deploy hooks, platform CLI invocations, or platform tokens. Deployment SHALL remain the responsibility of the hosting platform's own Git integration, and the repository's existing deployment configuration SHALL be left unchanged by this capability.

#### Scenario: No deploy step in the workflow
- **WHEN** the workflow's step list is inspected
- **THEN** it contains no step that deploys, publishes, or triggers a platform-specific deployment action

#### Scenario: Existing deployment config untouched
- **WHEN** this capability is implemented
- **THEN** the frontend's Vercel configuration file retains its original build command, output directory, install command, and rewrite rules
