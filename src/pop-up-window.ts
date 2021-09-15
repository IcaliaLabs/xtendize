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

function readFromLocalStorage (key: string) : Promise<any> {
  return new Promise((resolve, _reject) => {
    chrome.storage.local.get([key], result => resolve(result[key]))
  })
}

type WindowBounds = {
  top: number | undefined
  left: number | undefined
  width: number | undefined
  height: number | undefined
}

export class PopUpWindow {
  id: number | undefined
  tabId: number | undefined
  url: string
  width: number | undefined
  height: number | undefined
  left: number | undefined
  top: number | undefined
  uniqueId: number
  extensionId: string
  messageTypePrefix: string
  scriptInjector: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void

  actionMap: { [name: string]: Function } // { [name: string]: Array<Function> }
  windowResizeWaiters: Array<Promise<Function>>

  constructor(args: any) {
    const { messageTypePrefix } = args
    this.extensionId = args.extensionId
    this.messageTypePrefix = messageTypePrefix
    this.uniqueId = Math.random()
    this.url = args.url
    this.width = args.width
    this.height = args.height
    this.left = args.left
    this.top = args.top
    this.scriptInjector = this.injectContentScriptWhenReady.bind(this)
    this.windowResizeWaiters = []
    
    this.actionMap = {}
    const tokenReq = `${messageTypePrefix}:extension-token-requested`
    this.actionMap[tokenReq] = this.handleTokenRequest.bind(this)

    // Route messages coming from the app loaded in the window:
    chrome.runtime.onMessageExternal.addListener(
      this.routeInboundMessage.bind(this)
    )

    // Listen for tab changes:
    chrome.tabs.onUpdated.addListener(
      this.handlePopUpWindowTabChange.bind(this)
    )

    // Listen for window bound changes:
    chrome.windows.onBoundsChanged.addListener(
      this.listenForWindowBoundsChange.bind(this)
    )
  }

  async show() : Promise<Window> {
    let windowFocused = await this.focusPopUpWindow()
    if (windowFocused) return windowFocused

    let url = this.url
    let top = this.top
    let left = this.left
    let width = this.width
    let height = this.height

    const savedDataJson = await readFromLocalStorage('popUpWindowBounds') as string
    if (savedDataJson) {
      let savedData = JSON.parse(savedDataJson) as WindowBounds
      top = savedData.top
      left = savedData.left
      width = savedData.width
      height = savedData.height
    }

    const popUpWindowTabUrl = await readFromLocalStorage('popUpWindowTabUrl') as string
    if (popUpWindowTabUrl) url = popUpWindowTabUrl

    return this.createPopUpWindow({ url, top, left, width, height })
  }

  async getTab() : Promise<Tab | undefined> {
    const window = await this.getPopUpWindow()
    if (!window) return

    const tabs = window.tabs
    if (!tabs) return

    return tabs[0]
  }

  async sendMessage(message: any, responseCallback?: any): Promise<void> {
    let popUpTab = await this.getTab()
    if (!popUpTab || !popUpTab.id) return

    return chrome.tabs.sendMessage(popUpTab.id, message, responseCallback)
  }

  routeMessagesTo(subscribers: object) {
    const { messageTypePrefix } = this
    const tokenReq = `${messageTypePrefix}:extension-token-requested`
    for (const [messageType, responder] of Object.entries(subscribers)) {
      if (messageType == tokenReq) continue

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

  private handleTokenRequest(_message: any, _sender: any, sendResponse: any): void {
    let extensionToken = generateExtensionToken()
    const logPrefix = `[${this.messageTypePrefix} extension]`
    console.debug(`${logPrefix} Received token request. Responding with token "${extensionToken}"...`)
    sendResponse(extensionToken)
    return
  }

  private async createPopUpWindow(createData: WindowCreateData) : Promise<Window> {
    createData.type = "popup"
    createData.focused = true

    let window = await chrome.windows.create(createData)
    this.id = window.id
    chrome.storage.local.set({popUpWindowId: this.id})

    this.tabId = (window.tabs || [])[0].id
    chrome.storage.local.set({popUpWindowTabId: this.tabId})
  
    // If not already injected, inject the window messaging script, waiting
    // until page is loaded to inject the content script, or else a "cannot
    // access contents of url """ error will be raised:
    const { scriptInjector } = this
    const onUpd = chrome.tabs.onUpdated
    onUpd.hasListener(scriptInjector) || onUpd.addListener(scriptInjector)
  
    return window
  }

  // listener template method - use this.windowBoundsChangeListener instead!
  private async listenForWindowBoundsChange(window: Window) : Promise<void> {
    const popUpWindowId = await this.getPopUpWindowId()
    if (window.id != popUpWindowId) return

    this.top = window.top
    this.left = window.left
    this.width = window.width
    this.height = window.height

    chrome.storage.local.set({
      popUpWindowBounds: JSON.stringify({
        top: this.top,
        left: this.left,
        width: this.width,
        height: this.height
      })
    })
  }

  async handlePopUpWindowTabChange(tabId: number, changeInfo: TabChangeInfo, tab: Tab) : Promise<void> {
    let popUpWindowTab = await this.getTab()
    if (!popUpWindowTab || tabId != popUpWindowTab.id) return

    // For now, only "complete" status will be processed:
    if (changeInfo.status !== 'complete') return

    // Save the url into the saved state:
    chrome.storage.local.set({popUpWindowTabUrl: tab.url})
  }

  async injectContentScriptWhenReady(tabId: number, changeInfo: TabChangeInfo, tab: Tab) : Promise<void> {
    let popUpWindowTab = await this.getTab()
    if (!popUpWindowTab || tabId != popUpWindowTab.id || changeInfo.status !== 'complete') return
  
    // Request the loaded app website to initiate the extension connection:
    const { messageTypePrefix } = this
    chrome.scripting.executeScript({
      target: { tabId: popUpWindowTab.id },
      func: routeMessagesToWindow,
      args: [messageTypePrefix]
    })

    chrome.tabs.onUpdated.removeListener(this.scriptInjector)
  }

  private async getPopUpWindowId() : Promise<number | undefined> {
    if (typeof this.id !== undefined) return this.id

    return await readFromLocalStorage('popUpWindowId') as number
  }

  private async getPopUpWindow() : Promise<Window | undefined> {
    let popUpWindowId = await this.getPopUpWindowId()
    if (!popUpWindowId) return

    try {
      return await chrome.windows.get(popUpWindowId, {
        populate: true,
        windowTypes: ['popup']
      })
    } catch(e) {
      return
    }
  }

  private async focusPopUpWindow() : Promise<Window | undefined> {
    let window = await this.getPopUpWindow()
    let windowId = window?.id
    if (!windowId) return

    return chrome.windows.update(windowId, {
      drawAttention: true,
      focused: true
    })
  }
}
