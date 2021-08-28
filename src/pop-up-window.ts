///<reference types="chrome"/>

import { getActionFor } from "./action-mapping"
import { routeMessagesToWindow } from "./messaging/to-window"

import Tab = chrome.tabs.Tab
import TabChangeInfo = chrome.tabs.TabChangeInfo


import Window = chrome.windows.Window
import WindowCreateData = chrome.windows.CreateData

function generateExtensionToken(): string {
  let extensionToken = Math.random().toString(36).substr(2)
  if (chrome.storage) chrome.storage.local.set({ extensionToken })

  return extensionToken
}

function getExtensionToken(): Promise<string> {
  return new Promise((resolve, _reject) => {
    if (!chrome.storage) resolve(generateExtensionToken())

    chrome.storage.local.get(["extensionToken"], result => {
      const { extensionToken } = result
      console.debug("extensionToken:", extensionToken)
      if (typeof extensionToken === undefined) resolve(generateExtensionToken())
      else resolve(extensionToken)
    })
  })
}

function sendToken(_message: any, _sender: any, sendResponse: any): void {
  console.debug("Responding to connection request from website...")
  let extensionToken = generateExtensionToken()
  sendResponse(extensionToken)
  return
}

function readLocalStorage (key: string) : Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        reject(-1)
      } else {
        resolve(result[key])
      }
    })
  })
}

export class PopUpWindow {
  url: string
  width: number
  left: number
  top: number
  uniqueId: number
  extensionId: string
  actionMap: { [name: string]: Function } // { [name: string]: Array<Function> }

  constructor(args: any) {
    this.extensionId = args.extensionId
    this.uniqueId = Math.random()
    this.url = args.url
    this.width = args.width
    this.left = args.left
    this.top = args.top
    this.actionMap = {
      "xtendize:extension-token-requested": sendToken
    }

    // Route messages coming from the app loaded in the window:
    chrome.runtime.onMessageExternal.addListener(
      this.routeInboundMessage.bind(this)
    )
  }

  async show() : Promise<Window> {
    const { url, width, left, top } = this

    try {
      let window = await this.getPopUpWindow()
      if (window.id) return this.focusPopUpWindow(window.id)
    } catch (e) {
      console.log("show(): No window:", e)
    }
  
    return this.createPopUpWindow({ url, width, left, top })
  }

  async getTab() : Promise<Tab> {
    let popUpWindowTabId = await readLocalStorage('popUpWindowTabId')
    return chrome.tabs.get(popUpWindowTabId)
  }

  async sendMessage(message: any, responseCallback?: any): Promise<void> {
    let popUpTab = await this.getTab()
    if (!popUpTab || !popUpTab.id) return

    return chrome.tabs.sendMessage(popUpTab.id, message, responseCallback)
  }

  routeMessagesTo(subscribers: object) {
    for (const [messageType, responder] of Object.entries(subscribers)) {
      if (messageType == "xtendize:extension-token-requested") continue

      // if (!this.actionMap[messageType]) this.messageMap[messageType] = []
      // this.actionMap[messageType].push(responder)
      this.actionMap[messageType] = responder
    }
  }

  private routeInboundMessage(message: any, sender: any, sendResponse: any) : any {
    const { url } = this
    const { origin } = sender

    if (!url.startsWith(origin)) {
      console.debug("Origin mismatch: origin:", origin, "url:", url)
      return false
    }

    const { type } = message
    const action = getActionFor(this.actionMap, type)
    return action(message, sender, sendResponse)
  }

  private async createPopUpWindow(createData: WindowCreateData) : Promise<Window> {
    createData.type = "popup"
    createData.focused = true
    let window = await chrome.windows.create(createData);
  
    chrome.storage.local.set({activeWindow: window.id});
  
    let popUpWindowTabId = (window.tabs || [])[0].id
    chrome.storage.local.set({popUpWindowTabId});
  
    // Inject the window messaging script, waiting until page is loaded to
    // inject the content script, or else a "cannot access contents of url """
    // error will be raised:
    chrome.tabs.onUpdated.addListener(this.injectContentScriptWhenReady.bind(this))
  
    return window
  }

  async injectContentScriptWhenReady(tabId: number, changeInfo: TabChangeInfo, tab: Tab) : Promise<void> {
    let popUpWindowTabId = await readLocalStorage('popUpWindowTabId')
    if (tabId != popUpWindowTabId || changeInfo.status !== 'complete') return
  
    // Request the loaded app website to initiate the extension connection:
    chrome.scripting.executeScript({
      target: { tabId: popUpWindowTabId },
      func: routeMessagesToWindow,
      args: ['xtendize']
    })
  }

  async getPopUpWindow() : Promise<Window> {
    let popUpWindowId = await readLocalStorage('activeWindow');
    
    return await chrome.windows.get(popUpWindowId)
  }

  private focusPopUpWindow(windowId: number) : Promise<Window> {
    return chrome.windows.update(windowId, {
      drawAttention: true,
      focused: true
    })
  }
}
