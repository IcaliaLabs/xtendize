module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 109:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__nccwpck_require__(314), exports);
//# sourceMappingURL=main.js.map

/***/ }),

/***/ 314:
/***/ (function(__unused_webpack_module, exports) {


///<reference types="chrome"/>
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showPopUpWindow = exports.getPopUpTab = void 0;
function createPopUpWindow(createData) {
    createData.type = "popup";
    createData.focused = true;
    debugger;
    console.log("createData:", createData);
    return chrome.windows.create(createData);
}
function getPopUpWindow() {
    return __awaiter(this, void 0, void 0, function* () {
        let popUpWindowId = -1; // TODO: Get popUpWindowId from chrome.storage
        return yield chrome.windows.get(popUpWindowId);
    });
}
function focusPopUpWindow(windowId) {
    return chrome.windows.update(windowId, {
        drawAttention: true,
        focused: true
    });
}
function getPopUpTab(popUpWindowTabId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield chrome.tabs.get(popUpWindowTabId);
    });
}
exports.getPopUpTab = getPopUpTab;
function showPopUpWindow(createData) {
    return __awaiter(this, void 0, void 0, function* () {
        // try {
        //   let window = await getPopUpWindow()
        //   if (window.id) return focusPopUpWindow(window.id)
        // } catch (e) {}
        console.log("showPopUpWindow: createData:", createData);
        // return await createPopUpWindow(createData)
        return null;
    });
}
exports.showPopUpWindow = showPopUpWindow;
exports.default = { showPopUpWindow, getPopUpTab };
//# sourceMappingURL=window-management.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(109);
/******/ })()
;