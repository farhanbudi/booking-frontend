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

The main continuous-integration workflow SHALL provide dummy values for the environment variables the frontend reads at build and test time, so that the pipeline never contacts a live backend and never depends on a real secret. The values SHALL be defined at job scope in the workflow definition, and SHALL NOT be sourced from repository secrets. This requirement applies to the typecheck, unit test, and build workflow only; the separate end-to-end workflow is governed by the requirements of the end-to-end workflow contract.

#### Scenario: Build succeeds with dummy environment
- **WHEN** the build step runs in CI with only dummy environment values set
- **THEN** the production bundle is produced successfully

#### Scenario: Tests succeed without a backend
- **WHEN** the unit test step runs in CI with no backend service available
- **THEN** the unit test suite passes without requiring network access to an API server

### Requirement: A single aggregate status check gates merges

The continuous-integration workflow SHALL define a final job named `ci-success` that depends on all other jobs in that workflow, that always runs even when a dependency failed or was cancelled, and that fails whenever any dependency did not succeed. This job SHALL be the only status check that needs to be required for merging into `main`. The end-to-end workflow SHALL be a separate workflow file with its own job and SHALL NOT be added as a dependency of the aggregate job.

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

#### Scenario: End-to-end job is not part of the aggregate job
- **WHEN** the continuous-integration workflow's aggregate job dependencies are inspected
- **THEN** the end-to-end job is not listed as a dependency of `ci-success`

### Requirement: Deployment configuration is out of scope

The CI workflow SHALL NOT contain deployment logic, deploy hooks, platform CLI invocations, or platform tokens. Deployment SHALL remain the responsibility of the hosting platform's own Git integration, and the repository's existing deployment configuration SHALL be left unchanged by this capability.

#### Scenario: No deploy step in the workflow
- **WHEN** the workflow's step list is inspected
- **THEN** it contains no step that deploys, publishes, or triggers a platform-specific deployment action

#### Scenario: Existing deployment config untouched
- **WHEN** this capability is implemented
- **THEN** the frontend's Vercel configuration file retains its original build command, output directory, install command, and rewrite rules

### Requirement: End-to-end suite runs in a dedicated workflow

The repository SHALL contain a separate workflow file, distinct from the main continuous-integration workflow, that executes the existing end-to-end test suite. The workflow SHALL be triggered by pull requests, by pushes to the `main` branch, and by manual dispatch. The workflow SHALL request read-only repository permissions, SHALL declare a concurrency group unique to the end-to-end workflow and the ref, and SHALL cancel an in-progress run for the same ref when a newer run starts. The workflow SHALL be stored in `.github/workflows/` as a YAML file and SHALL parse without syntax errors.

#### Scenario: Pull request triggers the end-to-end workflow
- **WHEN** a pull request is opened or updated against the `main` branch
- **THEN** the end-to-end workflow starts automatically for that pull request

#### Scenario: Push to main triggers the end-to-end workflow
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the end-to-end workflow starts automatically for that push

#### Scenario: Manual dispatch is supported
- **WHEN** the end-to-end workflow is dispatched manually from the repository's Actions page
- **THEN** the workflow runs the end-to-end suite

#### Scenario: The two workflows stay separate
- **WHEN** the end-to-end workflow file is inspected
- **THEN** it is a different file from the main continuous-integration workflow and the main workflow file is not modified by it

### Requirement: End-to-end workflow runs against local throwaway services

The end-to-end job SHALL provide the services the suite needs as ephemeral containers started by the CI runner, and SHALL NOT contact any hosted or production service. The job SHALL provide a PostgreSQL instance whose database name satisfies the backend's test-database guard, SHALL provide a Redis instance when the backend's job queue requires it, and SHALL define health checks for every service container so the job waits until the services are accepting connections. All connection targets SHALL point at the runner's own loopback interface.

#### Scenario: Database service is available before the backend starts
- **WHEN** the end-to-end job reaches the backend start step
- **THEN** the PostgreSQL container is running and its health check has passed, and the database name contains the substring `test`

#### Scenario: Queue service is available before the backend starts
- **WHEN** the backend needs its background job queue while the end-to-end suite runs
- **THEN** a Redis container is running on the runner with a health check that has passed

#### Scenario: No external service is contacted
- **WHEN** the end-to-end job's configuration is inspected
- **THEN** every hostname it uses resolves to the local runner, and no hosted database, deployment platform, payment provider or mail provider is referenced

### Requirement: End-to-end workflow boots the backend service locally

The end-to-end job SHALL obtain the backend application by checking out its own repository into a subdirectory of the runner workspace, SHALL install its dependencies from its committed lockfile, and SHALL start it as a background process bound to a port on the runner. The backend's environment SHALL be provided by a throwaway environment file written by the workflow, containing only dummy values, and SHALL satisfy the backend's own requirement that the database name identifies a test database. The backend SHALL be started in a mode that serves the HTTP API and does not require an external mail or payment provider to be reachable.

#### Scenario: Backend source is available to the job
- **WHEN** the backend preparation steps run
- **THEN** the backend repository is checked out into a dedicated subdirectory and its dependencies are installed from the committed lockfile

#### Scenario: Backend environment is fully dummy
- **WHEN** the environment file written for the backend is inspected
- **THEN** it contains no real credential, no production URL and no secret, and its database name identifies a test database

#### Scenario: Backend serves the API without external providers
- **WHEN** the backend process is started
- **THEN** it serves the HTTP API on the configured local port and does not require a mail server, payment provider or hosted database to be reachable

### Requirement: End-to-end workflow waits for backend readiness

The end-to-end job SHALL verify that the backend has become ready before it starts the browser suite, by polling the backend's unauthenticated health endpoint with retries until it answers successfully or a bounded number of attempts is exhausted. When the backend does not become ready, the job SHALL print the captured backend output and SHALL fail. The job SHALL NOT begin the browser suite while the backend is still starting.

#### Scenario: Backend becomes ready
- **WHEN** the backend answers the health check request successfully
- **THEN** the job proceeds to run the end-to-end suite

#### Scenario: Backend fails to start
- **WHEN** the health check keeps failing until the retry budget is exhausted
- **THEN** the captured backend output is printed in the job log and the job fails without running the browser suite

### Requirement: End-to-end workflow publishes failure artifacts

The end-to-end job SHALL upload the end-to-end report, the raw per-test result files, and the captured backend output as workflow artifacts, with a bounded retention period, and SHALL upload them even when the suite failed. The artifacts SHALL NOT contain real credentials.

#### Scenario: Suite fails and artifacts are still available
- **WHEN** the end-to-end suite reports a failure
- **THEN** the report, the result files and the backend output are downloadable from the workflow run

#### Scenario: Suite succeeds and artifacts are still available
- **WHEN** the end-to-end suite passes
- **THEN** the report and the backend output are downloadable from the workflow run

### Requirement: End-to-end check is not a merge gate

The end-to-end job SHALL be reported as its own status check and SHALL NOT be required for merging into `main` by this change. Making the check required SHALL remain a manual decision taken by the repository owner after the check has proven stable.

#### Scenario: Merge is not blocked by the end-to-end check
- **WHEN** a pull request is merged while the end-to-end job is failing or has not been made required
- **THEN** the merge is not rejected because of the end-to-end status check
