## ADDED Requirements

### Requirement: Unit test suite is executed in CI

The repository SHALL execute the unit/component test suite as part of its continuous-integration run, using the same non-watch mode that a developer gets locally, and SHALL NOT depend on any backend service, database, browser binary, or real credential being available. The end-to-end suite SHALL NOT be part of the CI unit test run.

#### Scenario: CI runs the unit test suite
- **WHEN** the CI pipeline executes its test step
- **THEN** the unit/component test suite is executed in a non-watch mode that terminates on its own and reports a pass/fail result per test case

#### Scenario: CI test step needs no backend
- **WHEN** the CI test step runs on a machine where no backend service is listening on the configured API base URL
- **THEN** the unit/component test suite still executes and passes

#### Scenario: End-to-end specs are not collected
- **WHEN** the CI test step collects test files
- **THEN** no end-to-end spec file under the `e2e` directory is collected or executed

#### Scenario: Failing test fails the pipeline
- **WHEN** any unit/component test fails
- **THEN** the CI test step exits with a non-zero status and the pipeline reports failure

#### Scenario: Tests do not depend on the date they run
- **WHEN** the unit/component suite is executed on any calendar date
- **THEN** every test produces the same result as it does on any other date, because time-dependent behavior is controlled rather than read from the wall clock
