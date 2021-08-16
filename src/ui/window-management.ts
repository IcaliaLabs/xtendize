import browser from "webextension-polyfill"


async function createPopUpWindow(url : string, callback? : Function) {
  let window = await browser.windows.create({
    url: url,
    type: "popup",
    width: 360,
    left: 1080,
    focused: true,
    top: 0
  })
  
  // popUpWindowId = window.id
  // popUpWindowTabId = window.tabs[0].id

  // Wait until page is loaded to inject the content script, or else a
  // "cannot access contents of url """ error will be raised:
  if (callback) callback(window)
  return
}

async function getPopUpWindow(popUpWindowId: number) {
  if (popUpWindowId == null) return null

  try { return await browser.windows.get(popUpWindowId) } catch (e) {}

  return null
}

async function focusPopUpWindow(popUpWindowId: number) {
  return await browser.windows.update(popUpWindowId, {
    drawAttention: true,
    focused: true
  })
}

export function getPopUpTab(popUpWindowTabId: number) {
  if (typeof popUpWindowTabId === 'undefined' || !popUpWindowTabId) return

  return browser.tabs.get(popUpWindowTabId)
}

export async function showPopUpWindow(url: string, popUpWindowId?: number, callback? : Function) {
  if (popUpWindowId) {
    let window = await getPopUpWindow(popUpWindowId)
    if (window) return await focusPopUpWindow(popUpWindowId)
  }

  return await createPopUpWindow(url)
}

export default { showPopUpWindow, getPopUpTab }


