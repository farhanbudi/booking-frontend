## ADDED Requirements

### Requirement: End-to-end suite is executed in CI
The end-to-end suite SHALL be executed automatically by the repository's continuous-integration pipeline, using the same npm script a developer uses locally, against a real running application, a real backend process and a real database instance. The run SHALL NOT require a developer to start any service by hand, and SHALL NOT depend on the unit test suite's environment.

#### Scenario: Suite runs automatically on a pull request
- **WHEN** a pull request is opened against the `main` branch
- **THEN** the end-to-end suite is executed by the pipeline without any manual preparation step

#### Scenario: Suite uses the existing npm script
- **WHEN** the end-to-end job's step list is inspected
- **THEN** the suite is executed through the repository's end-to-end npm script rather than an inline command that could drift from it

#### Scenario: Suite runs against real infrastructure
- **WHEN** the end-to-end suite starts
- **THEN** the application under test, the backend API and the database are all reachable processes on the CI runner

### Requirement: End-to-end environment details are overridable
The end-to-end suite's environment-specific details — the base URL of the application under test, the base URL of the backend API, the location where debug output is written, and the location of the generated report and result files — SHALL be readable from environment variables, and SHALL keep the values that are in use today as their defaults when the variables are not set. No end-to-end assertion, timeout, or expected message SHALL be weakened in order to make the suite runnable in CI.

#### Scenario: Defaults are preserved
- **WHEN** the end-to-end suite runs without any of the environment variables set
- **THEN** it behaves exactly as it does today, using the same base URLs and the same output locations as the current local setup

#### Scenario: CI can point the suite at its own services
- **WHEN** the environment variables are set to the CI runner's local addresses
- **THEN** the suite targets those addresses instead of the default ones, without any file in the repository having to change

#### Scenario: Machine-specific paths are not hardcoded
- **WHEN** the end-to-end suite runs on a runner whose filesystem layout differs from the developer's machine
- **THEN** no step fails because a hardcoded local directory does not exist on that machine

### Requirement: End-to-end execution in CI is deterministic and diagnosable
The end-to-end run in CI SHALL execute test files serially, SHALL NOT retry more than once, SHALL fail the job when a test fails, SHALL forbid accidentally committed focused tests, and SHALL capture a trace and a screenshot for every failed test. The generated report SHALL NOT open a browser window on the CI machine.

#### Scenario: Tests run serially against the shared backend
- **WHEN** the end-to-end run executes in CI
- **THEN** only one test file runs at a time against the shared backend and database

#### Scenario: Focused tests are rejected in CI
- **WHEN** a focused or single-test marker is committed in the end-to-end specs
- **THEN** the CI run fails instead of silently executing only the focused test

#### Scenario: Failure evidence is captured
- **WHEN** a test fails in CI
- **THEN** a trace and a screenshot for that test are produced and are part of the uploaded artifacts

#### Scenario: A failing test fails the job
- **WHEN** any end-to-end test fails
- **THEN** the end-to-end job exits with a non-zero status

### Requirement: Unit test runner ignores the end-to-end specs
The unit/component test runner SHALL NOT collect any file from the end-to-end spec directory, so that running the unit test suite neither requires a backend nor executes browser journeys.

#### Scenario: End-to-end specs are not collected
- **WHEN** the unit test suite collects test files
- **THEN** no end-to-end spec file is collected or executed
