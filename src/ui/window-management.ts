///<reference types="chrome"/>

import Tab = chrome.tabs.Tab
import WindowCreateData = chrome.windows.CreateData
import Window = chrome.windows.Window

function createPopUpWindow(createData: WindowCreateData) : Promise<Window> {
  createData.type = "popup"
  createData.focused = true
  debugger
  console.log("createData:", createData)
  return chrome.windows.create(createData)
}

async function getPopUpWindow() : Promise<Window> {
  let popUpWindowId = -1 // TODO: Get popUpWindowId from chrome.storage
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

export async function showPopUpWindow(createData: WindowCreateData) : Promise<Window | null> {
  // try {
  //   let window = await getPopUpWindow()
  //   if (window.id) return focusPopUpWindow(window.id)
  // } catch (e) {}

  console.log("showPopUpWindow: createData:", createData)
  // return await createPopUpWindow(createData)
  return null
}

export default { showPopUpWindow, getPopUpTab }


