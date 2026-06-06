# Changelog

## [0.11.0](https://github.com/SohelIslamImran/expo-in-app-updates/compare/v0.10.0-beta.0...v0.11.0) (2026-06-06)

### ✨ Features

* add [#23](https://github.com/SohelIslamImran/expo-in-app-updates/issues/23) to the document ([#28](https://github.com/SohelIslamImran/expo-in-app-updates/issues/28)) ([b79a2c0](https://github.com/SohelIslamImran/expo-in-app-updates/commit/b79a2c0a7cbc1dc217dc17fb9029b1bfc4a362f7))
* use PlayStore API's `updatePriority()` value as a default ([#23](https://github.com/SohelIslamImran/expo-in-app-updates/issues/23)) ([c0805f8](https://github.com/SohelIslamImran/expo-in-app-updates/commit/c0805f853e9be13491bf9fff2b22f47bce8f4082))

### 🐛 Bug Fixes

* **android:** wrap startUpdateFlowForResult in try/catch to prevent SendIntentException crash ([#26](https://github.com/SohelIslamImran/expo-in-app-updates/issues/26)) ([2b44e20](https://github.com/SohelIslamImran/expo-in-app-updates/commit/2b44e20e78f3968faf927a6267042f9805aab249))

### 🛠️ Changes in Build Process & Tools

* update schema path in biome.json to use local configuration ([4bc744d](https://github.com/SohelIslamImran/expo-in-app-updates/commit/4bc744dab418c3badd0676859ef9d3c153d188bb))
* upgrade expo module to sdk 56 ([d05591d](https://github.com/SohelIslamImran/expo-in-app-updates/commit/d05591d6b0d17df126e09461cd9e5c857f3555d4))

## [0.10.0-beta.0](https://github.com/SohelIslamImran/expo-in-app-updates/compare/v0.9.0...v0.10.0-beta.0) (2025-04-06)

### ✨ Features

* add event handling for update start, download, cancellation, and completion in both Android and iOS modules. ([fb81137](https://github.com/SohelIslamImran/expo-in-app-updates/commit/fb81137433df196079d9dafd45a120327328fadc))

### 🛠️ Changes in Build Process & Tools

* Update CHANGELOG.md for version 0.9.0 ([4c499c7](https://github.com/SohelIslamImran/expo-in-app-updates/commit/4c499c712c58dc81074a1dd1c405a8eb87a2d6cc))

## [0.9.0](https://github.com/SohelIslamImran/expo-in-app-updates/compare/v0.7.0...v0.9.0) (2025-02-06)

### 🐛 Bug Fixes

* **ios:** Improve version comparison for update availability ([bd8b128](https://github.com/SohelIslamImran/expo-in-app-updates/commit/bd8b1283c0b8523d775370ed96e4289cab3bf738))

### 🛠️ Changes in Build Process & Tools

* Update .npmignore and clean up CHANGELOG.md ([bf4ba09](https://github.com/SohelIslamImran/expo-in-app-updates/commit/bf4ba09dee7278251664762dd47c9d04b8e23793))

## 0.7.0 (2025-02-05)

### 🐛 Bug Fixes

* **ios:** country restricted apps lookup fails ([#14](https://github.com/SohelIslamImran/expo-in-app-updates/issues/14)) ([c9eb093](https://github.com/SohelIslamImran/expo-in-app-updates/commit/c9eb093f45cf974e719c95fc2e82dba7e443cbb0))

### 📚 Documentation

* Add changelog reference to README ([d91fa19](https://github.com/SohelIslamImran/expo-in-app-updates/commit/d91fa194216095b9550642c6aa7d15337c1302cc))
* Add testing instructions for in-app updates on Android and iOS ([9545587](https://github.com/SohelIslamImran/expo-in-app-updates/commit/9545587678866419b4084cdf89f9b39ebb588e39))

### 🛠️ Changes in Build Process & Tools

* Add release-it configuration and update development scripts ([c5f5784](https://github.com/SohelIslamImran/expo-in-app-updates/commit/c5f5784d22591a6daeb2ea2c28b7858c035303e7))
* Update dependencies ([6b11990](https://github.com/SohelIslamImran/expo-in-app-updates/commit/6b1199020799fc4b14f012f3b02ad1e143ec6653))

## 0.6.0 - (2025-01-05)

* Updated configuration files and dependencies ([commit](https://github.com/SohelIslamImran/expo-in-app-updates/commit/07dcbfb66c30eaeacd3bd1fe943e06012e46de67))
* Upgraded to Expo SDK 52, supporting only SDK 52 and above.

## 0.5.0 - (2025-01-03)

* Added support for release date ([commit](https://github.com/SohelIslamImran/expo-in-app-updates/commit/3a5ffa75ac9753fd6487e51823e032a3080100fe))

* Fixed iOS caching issue on lookup endpoint #7 ([commit](https://github.com/SohelIslamImran/expo-in-app-updates/commit/66e96dc8fd27b6d6900c78ef4f84083848d4ac14))
