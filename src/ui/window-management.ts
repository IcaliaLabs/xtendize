///<reference types="chrome"/>

import { windowMessagingSetup } from "./window-messaging"

import Tab = chrome.tabs.Tab
import TabChangeInfo = chrome.tabs.TabChangeInfo
import WindowCreateData = chrome.windows.CreateData
import Window = chrome.windows.Window

async function injectContentScriptWhenReady(tabId: number, changeInfo: TabChangeInfo, tab: Tab) {
  let popUpWindowTabId = await readLocalStorage('popUpWindowTabId')
  if (tabId != popUpWindowTabId || changeInfo.status !== 'complete') return

  // Request the loaded app website to initiate the extension connection:
  await chrome.scripting.executeScript({
    target: { tabId: popUpWindowTabId },
    func: windowMessagingSetup
  })

  await chrome.tabs.onUpdated.removeListener(injectContentScriptWhenReady)
}

function readLocalStorage (key: string) : Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        reject(-1);
      } else {
        resolve(result[key]);
      }
    });
  });
};

async function createPopUpWindow(createData: WindowCreateData) : Promise<Window>{
  createData.type = "popup"
  createData.focused = true
  let window = await chrome.windows.create(createData);

  chrome.storage.local.set({activeWindow: window.id});

  let popUpWindowTabId = (window.tabs || [])[0].id
  chrome.storage.local.set({popUpWindowTabId});

  // Inject the window messaging script, waiting until page is loaded to inject
  // the content script, or else a "cannot access contents of url """ error will
  // be raised:
  chrome.tabs.onUpdated.addListener(injectContentScriptWhenReady)

  return window;
}

async function getPopUpWindow() : Promise<Window> {
  let popUpWindowId = await readLocalStorage('activeWindow');
  
  return await chrome.windows.get(popUpWindowId)
}

function focusPopUpWindow(windowId: number) : Promise<Window> {
  return chrome.windows.update(windowId, {
    drawAttention: true,
    focused: true
  })
}

export async function getPopUpTab() : Promise<Tab> {
  let popUpWindowTabId = await readLocalStorage('popUpWindowTabId')
  return chrome.tabs.get(popUpWindowTabId)
}

export async function showPopUpWindow(createData: WindowCreateData) : Promise<Window> {
  try {
    let window = await getPopUpWindow()
  if (window.id) return focusPopUpWindow(window.id)
  } catch (e) {
    console.log("showPopUpWindow: No window:", e);
  }

  return createPopUpWindow(createData);
}

export default { showPopUpWindow, getPopUpTab }
