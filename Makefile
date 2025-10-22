NPM_BIN_DIR := $(CURDIR)/node_modules/.bin
GENFILES_DIR := $(CURDIR)/lib

GIT_REVISION := $(shell git rev-parse --verify HEAD)

export PACKAGE_NAME := $(shell node -p "require('./package.json').name")
export CURRENT_VERSION := $(shell npm view $(PACKAGE_NAME) version 2>/dev/null || echo 0.0.0)
export LOCAL_VERSION := $(shell node -p "require('./package.json').version")

.PHONY: init
init:
	yarn

.PHONY: build
build: 
	yarn build

.PHONY: clean-build
clean-build:
	rm -rf $(GENFILES_DIR)

.PHONY: tsc
tsc:
	$(NPM_BIN_DIR)/tsc --project tsconfig.json

.PHONY: test
test:
	yarn test

.PHONY: lint
lint:
	yarn lint

.PHONY: publish-dry
publish-dry:
	npm publish --dry-run

.PHONY: publish
publish: copy-genfiles
ifeq ($(shell $(NPM_BIN_DIR)/semver -r ">$(CURRENT_VERSION)" $(LOCAL_VERSION) ),$(LOCAL_VERSION))
	npm publish --access public
else
	@echo "$(LOCAL_VERSION) exists. skip publish."
endif
