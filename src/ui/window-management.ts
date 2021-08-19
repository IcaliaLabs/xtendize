///<reference types="chrome"/>

import Tab = chrome.tabs.Tab
import WindowCreateData = chrome.windows.CreateData
import Window = chrome.windows.Window

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

export async function getPopUpTab(popUpWindowTabId: number) : Promise<Tab> {
  return await chrome.tabs.get(popUpWindowTabId)
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
