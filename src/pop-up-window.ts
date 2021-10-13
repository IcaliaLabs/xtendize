///<reference types="chrome"/>

import { getActionFor } from "./action-mapping"
import { routeMessagesToWindow } from "./messaging/to-window"

import Tab = chrome.tabs.Tab
import TabChangeInfo = chrome.tabs.TabChangeInfo
import ScriptInjection = chrome.scripting.ScriptInjection

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

class ScriptInjectionsRegistry {
  registeredScriptInjections: Array<ScriptInjection>

  constructor(initialScripts: Array<any>) {
    this.registeredScriptInjections = initialScripts || []
  }

  add(injection: ScriptInjection): void {
    this.registeredScriptInjections.push(injection)
  }
}

export class PopUpWindow {
  tabId: number | undefined
  url: string
  width: number | undefined
  height: number | undefined
  left: number | undefined
  top: number | undefined
  uniqueId: number
  extensionId: string
  messageTypePrefix: string
  logPrefix: string

  actionMap: { [name: string]: Function } // { [name: string]: Array<Function> }
  windowResizeWaiters: Array<Promise<Function>>

  scripts: ScriptInjectionsRegistry

  constructor(args: any) {
    const { messageTypePrefix } = args
    this.extensionId = args.extensionId
    this.messageTypePrefix = messageTypePrefix
    this.logPrefix = `[${this.messageTypePrefix} extension]`
    this.uniqueId = Math.random()
    this.url = args.url
    this.width = args.width
    this.height = args.height
    this.left = args.left
    this.top = args.top
    this.windowResizeWaiters = []

    this.actionMap = {}
    const tokenReq = `${messageTypePrefix}:extension-token-requested`
    this.actionMap[tokenReq] = this.handleTokenRequest.bind(this)

    this.scripts = new ScriptInjectionsRegistry([
      { func: routeMessagesToWindow, args: [this.messageTypePrefix] }
    ])

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

    chrome.windows.onRemoved.addListener(
      this.handleWindowClose.bind(this)
    )
  }

  handleWindowClose(windowId: number) : void {
    chrome.storage.local.remove([
      'popUpWindowOpen',
      'popUpWindowId',
      'popUpWindowTabId'
    ])

    return
  }

  async show() : Promise<Window> {
    const windowIsOpen = await this.getWindowIsOpen()

    if (windowIsOpen) {
      const windowFocused = await this.focusPopUpWindow()
      if (windowFocused) return windowFocused
    }

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

  async close() : Promise<void> {
    let window = await this.getPopUpWindow()
    let windowId = window?.id
    if (!windowId) return

    return chrome.windows.remove(windowId)
  }

  async isOpen() : Promise<boolean> {
    return (await this.getWindowIsOpen()) && this.getPopUpWindow()
  }

  async getTab() : Promise<Tab | undefined> {
    const windowIsOpen = await this.getWindowIsOpen()
    if (!windowIsOpen) return

    const window = await this.getPopUpWindow()
    if (!window) {
      if (windowIsOpen) console.warn(
        `${this.logPrefix} PopUpWindow.getTab:`,
        "Calling this.getPopUpWindow() unexpectedly returned undefined. window:",
        window
      )
      return
    }

    const tabs = window.tabs
    if (!tabs) {
      console.warn(
        `${this.logPrefix} getTab:`,
        "The returned window's .tabs is empty-ish. window.tabs:",
        tabs
      )
      return
    }

    return tabs[0]
  }

  async sendMessage(message: any, responseCallback?: any): Promise<void> {
    const windowIsOpen = await this.getWindowIsOpen()
    if (!windowIsOpen) return

    let popUpTab = await this.getTab()
    if (!popUpTab) {
      console.warn(
        `${this.logPrefix} PopUpWindow.sendMessage:`,
        "Calling this.getTab() unexpectedly returned undefined"
      )
      return
    }

    if (!popUpTab.id) {
      console.warn(
        `${this.logPrefix} PopUpWindow.sendMessage:`,
        "Calling this.getTab() unexpectedly returned an object without an id. popUpTab:",
        popUpTab
      )
      return
    }

    console.debug(`${this.logPrefix}: PopUpWindow.sendMessage:`, message, "callback:", responseCallback)
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
    console.debug(`${this.logPrefix} Received token request. Responding with token "${extensionToken}"...`)
    sendResponse(extensionToken)
    return
  }

  private async createPopUpWindow(createData: WindowCreateData) : Promise<Window> {
    createData.type = "popup"
    createData.focused = true

    let window = await chrome.windows.create(createData)
    chrome.storage.local.set({popUpWindowId: window.id})
    chrome.storage.local.set({popUpWindowOpen: true})

    this.tabId = (window.tabs || [])[0].id
    chrome.storage.local.set({popUpWindowTabId: this.tabId})

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

    return
  }

  private async getWindowIsOpen(): Promise<any> {
    const itIs = await readFromLocalStorage('popUpWindowOpen')
    return !!itIs
  }

  async handlePopUpWindowTabChange(tabId: number, changeInfo: TabChangeInfo, tab: Tab) : Promise<void> {
    const popUpWindowTab = await this.getTab()
    if (!popUpWindowTab) return
    if (tabId != popUpWindowTab.id) return

    // For now, only "complete" status will be processed:
    if (changeInfo.status !== 'complete') return

    // Save the url into the saved state:
    console.debug(`${this.logPrefix} PopUpWindow.handlePopUpWindowTabChange: saving new URL to saved window state:`, tab.url)
    chrome.storage.local.set({popUpWindowTabUrl: tab.url})

    // Install all the registered content scripts, including the script that
    // sets the window message routing when the page is initialized:
    this.scripts.registeredScriptInjections.forEach(script => {
      chrome.scripting.executeScript({ ...script, target: { tabId } })
    })

    return
  }

  private async getPopUpWindowId() : Promise<number | undefined> {
    const popUpWindowIsOpen = await this.getWindowIsOpen()
    if (!popUpWindowIsOpen) return
    const popUpWindowId = await readFromLocalStorage('popUpWindowId') as number
    if (!popUpWindowId) {
      console.warn(
        `${this.logPrefix} PopUpWindow.getPopUpWindowId:`,
        "Calling readFromLocalStorage('popUpWindowId') unexpectedly returned undefined.",
        "If this is the first time using the extension or reloading it, it's OK"
      )
      return
    }

    return popUpWindowId
  }

  private async getPopUpWindow() : Promise<Window | undefined> {

    let popUpWindowId = await this.getPopUpWindowId()
    if (!popUpWindowId) {
      console.warn(
        `${this.logPrefix} PopUpWindow.getPopUpWindow:`,
        "Calling this.getPopUpWindowId() returned undefined: popUpWindowId:",
        popUpWindowId
      )
      return
    }

    try {
      return await chrome.windows.get(popUpWindowId, {
        populate: true,
        windowTypes: ['popup']
      })
    } catch(e) {
      console.warn(
        `${this.logPrefix} getPopUpWindow:`,
        "Calling chrome.windows.get raised an error:",
        e
      )
      return
    }
  }

  private async focusPopUpWindow() : Promise<Window | undefined> {
    let window = await this.getPopUpWindow()
    let windowId = window?.id
    if (!windowId) return

    await chrome.windows.update(windowId, {
      drawAttention: true,
      focused: true
    })

    return window
  }
}
