# Changelog


## [0.0.2](https://github.com/bucketeer-io/openfeature-node-server-sdk/compare/v0.0.1...v0.0.2) (2026-06-29)


### Features

* await client destroy on provider close ([#19](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/19)) ([6f3503f](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/6f3503f604213a2b698191a0116f15340c5bc4a9))


### Bug Fixes

* align equals/in semver fallback behavior with comparison operators ([#12](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/12)) ([b15548c](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/b15548cf1429121394e26e19e6cf6f284118e764))
* correct node sdk package name ([#7](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/7)) ([b0ffa28](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/b0ffa284206b1a132b146d30682a4c2d06e198ae))


### Miscellaneous

* enhancing type safety in resolveObjectEvaluation ([#14](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/14)) ([1dd72b1](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/1dd72b199141bcbe222c6a64d993c107fd74401b))
* release v0.0.1 ([#9](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/9)) ([4cca100](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/4cca1006672a2efaeb12063dc683237b7b4d1946))


### Build System

* **deps:** update @bucketeer/node-server-sdk to v0.4.4 ([#10](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/10)) ([6d9ad96](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/6d9ad9641f097cc44574e63631fa3b1d5653278c))
* **deps:** update @bucketeer/node-server-sdk to v0.4.6 ([#17](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/17)) ([26231b1](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/26231b17259e8ad7293591c4d1f899152fe0730a))
* move tsconfigs into test/ and e2e/ for editor discoverability ([#18](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/18)) ([221c5a9](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/221c5a998e7a5661798fa28ded863ef69fa68d88))

<!-- dependency-changes:start -->

### Node Server SDK Changes

This release also brings the following changes from the underlying Node.js server SDK.

#### Node Server SDK ([v0.4.1...v0.4.6](https://github.com/bucketeer-io/node-server-sdk/compare/v0.4.1...v0.4.6))

##### Features

* migrate grpc to use rest api ([node-server-sdk#186](https://github.com/bucketeer-io/node-server-sdk/issues/186))
* support auto retry for http requests ([node-server-sdk#198](https://github.com/bucketeer-io/node-server-sdk/issues/198))
* add graceful shutdown with event batching ([node-server-sdk#142](https://github.com/bucketeer-io/node-server-sdk/issues/142))
* add yaml flag type support [#2217](https://github.com/bucketeer-io/bucketeer/pull/2217)
* support for asynchronous initialization ([node-server-sdk#122](https://github.com/bucketeer-io/node-server-sdk/issues/122))
* unify initialization process with other sdks ([node-server-sdk#106](https://github.com/bucketeer-io/node-server-sdk/issues/106))

##### Bug Fixes

* handle mid-response stall ([node-server-sdk#212](https://github.com/bucketeer-io/node-server-sdk/issues/212))
* measure latencySecond with monotonic high-resolution clock ([node-server-sdk#200](https://github.com/bucketeer-io/node-server-sdk/issues/200))
* align equals/in semver fallback behavior with comparison operators ([node-server-sdk#182](https://github.com/bucketeer-io/node-server-sdk/issues/182))
* explicitly export types used in interface to resolve lint warning ([node-server-sdk#126](https://github.com/bucketeer-io/node-server-sdk/issues/126))
* incorrect print level for the DefaultLogger ([node-server-sdk#134](https://github.com/bucketeer-io/node-server-sdk/issues/134))
* resolve missing dependencies in incremental feature flag evaluation ([node-server-sdk#136](https://github.com/bucketeer-io/node-server-sdk/issues/136))

##### Miscellaneous

* add api endpoint scheme configuration ([node-server-sdk#161](https://github.com/bucketeer-io/node-server-sdk/issues/161))

##### Build System

* **deps:** bump runtime-dependencies group to v11.1.1 [SECURITY] ([node-server-sdk#203](https://github.com/bucketeer-io/node-server-sdk/issues/203))
* **dev-deps:** bump dev-minor ([node-server-sdk#188](https://github.com/bucketeer-io/node-server-sdk/issues/188))
* **dev-deps:** bump dev-patch ([node-server-sdk#183](https://github.com/bucketeer-io/node-server-sdk/issues/183))
* **dev-deps:** bump dev-patch ([node-server-sdk#187](https://github.com/bucketeer-io/node-server-sdk/issues/187))
* **dev-deps:** bump dev-patch ([node-server-sdk#202](https://github.com/bucketeer-io/node-server-sdk/issues/202))
* **dev-deps:** bump dev-patch ([node-server-sdk#167](https://github.com/bucketeer-io/node-server-sdk/issues/167))
* **dev-deps:** bump dev-patch group to v9.39.2 ([node-server-sdk#176](https://github.com/bucketeer-io/node-server-sdk/issues/176))
* **deps-dev:** bump @eslint/js from 9.36.0 to 9.39.1 ([node-server-sdk#155](https://github.com/bucketeer-io/node-server-sdk/issues/155))
* **deps-dev:** bump the build-patch group with 2 updates ([node-server-sdk#153](https://github.com/bucketeer-io/node-server-sdk/issues/153))
* **deps-dev:** bump the build-patch group with 3 updates ([node-server-sdk#146](https://github.com/bucketeer-io/node-server-sdk/issues/146))
* **deps-dev:** bump @eslint/js from 9.34.0 to 9.36.0 ([node-server-sdk#131](https://github.com/bucketeer-io/node-server-sdk/issues/131))
* **deps-dev:** bump @typescript-eslint/eslint-plugin ([node-server-sdk#141](https://github.com/bucketeer-io/node-server-sdk/issues/141))
* **deps-dev:** bump @typescript-eslint/parser from 8.41.0 to 8.45.0 ([node-server-sdk#133](https://github.com/bucketeer-io/node-server-sdk/issues/133))
* **deps-dev:** bump @typescript-eslint/parser from 8.45.0 to 8.46.2 ([node-server-sdk#139](https://github.com/bucketeer-io/node-server-sdk/issues/139))
* **deps-dev:** bump the npm-minor-all group with 14 updates ([node-server-sdk#120](https://github.com/bucketeer-io/node-server-sdk/issues/120))
* **deps-dev:** bump the npm-minor-all group with 2 updates ([node-server-sdk#123](https://github.com/bucketeer-io/node-server-sdk/issues/123))
* **deps-dev:** bump the test-dependencies group with 3 updates ([node-server-sdk#137](https://github.com/bucketeer-io/node-server-sdk/issues/137))
* **deps:** bump the build-patch group with 5 updates ([node-server-sdk#138](https://github.com/bucketeer-io/node-server-sdk/issues/138))
* **deps:** bump the dependencies group across 1 directory with 19 updates ([node-server-sdk#100](https://github.com/bucketeer-io/node-server-sdk/issues/100))
* **deps:** bump the npm-patch-all group with 3 updates ([node-server-sdk#129](https://github.com/bucketeer-io/node-server-sdk/issues/129))
* **deps:** bump the npm-patch-all group with 5 updates ([node-server-sdk#119](https://github.com/bucketeer-io/node-server-sdk/issues/119))

<!-- dependency-changes:end -->

## [0.0.1](https://github.com/bucketeer-io/openfeature-node-server-sdk/compare/v0.0.1...v0.0.1) (2025-11-21)


### Features

* add openfeature provider implementation ([#3](https://github.com/bucketeer-io/openfeature-node-server-sdk/issues/3)) ([18e1dea](https://github.com/bucketeer-io/openfeature-node-server-sdk/commit/18e1deadd49dded673208f281d682247a4a02c4f))
