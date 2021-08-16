import browser from "webextension-polyfill"

import Tab = browser.Tabs.Tab
import WindowCreateData = browser.Windows.CreateCreateDataType
import Window = browser.Windows.Window

async function createPopUpWindow(createData: WindowCreateData) : Promise<Window> {
  createData.type = "popup"
  createData.focused = true

  let window = browser.windows.create(createData)

  // TODO: Store the window id on chrome.storage
  console.log("window:", window)

  return window
}

async function getPopUpWindow() : Promise<Window> {
  let popUpWindowId = -1 // TODO: Get popUpWindowId from chrome.storage
  return await browser.windows.get(popUpWindowId)
}

function focusPopUpWindow(windowId: number) : Promise<Window> {
  return browser.windows.update(windowId, {
    drawAttention: true,
    focused: true
  })
}

export async function getPopUpTab(popUpWindowTabId: number) : Promise<Tab> {
  return await browser.tabs.get(popUpWindowTabId)
}

export async function showPopUpWindow(createData: WindowCreateData) : Promise<Window> {
  try {
    let window = await getPopUpWindow()
    if (window.id) return focusPopUpWindow(window.id)
  } catch (e) {}

  return await createPopUpWindow(createData)
}

export default { showPopUpWindow, getPopUpTab }


