///<reference types="chrome"/>

import { showPopUpWindow, getPopUpTab } from "./ui/window-management"

function generateExtensionToken(): string {
  let extensionToken = Math.random().toString(36).substr(2)
  if (chrome.storage) chrome.storage.local.set({extensionToken})

  return extensionToken
}

function getExtensionToken(): Promise<string> {
  return new Promise((resolve, _reject) => {
    if (!chrome.storage) resolve(generateExtensionToken())

    chrome.storage.local.get(["extensionToken"], result => {
      const { extensionToken } = result
      console.debug ("extensionToken:", extensionToken)
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

function nullAction(message: any, sender: any, _sendResponse: any): void {
  const { type } = message
  console.warn(`Received unknown message type '${type}':`, message, sender)
  return
}

export class PopUpWindow {
  url: string
  width: number
  left: number
  top: number
  uniqueId: number
  extensionId: string
  messageMap: { [name: string]: Function } // { [name: string]: Array<Function> }
 
  constructor(args: any) {
    this.extensionId = args.extensionId
    this.uniqueId = Math.random()
    this.url = args.url
    this.width = args.width
    this.left = args.left
    this.top = args.top
    this.messageMap = {
      "xtendize:extension-token-requested" : sendToken
    }

    // Route messages coming from the app loaded in the window:
    chrome.runtime.onMessageExternal.addListener(
      this.routeInboundMessage.bind(this)
    )
  }
 
  show() {
    const { url, width, left, top } = this
    return showPopUpWindow({ url, width, left, top })
  }

  async sendMessage(message: any, responseCallback?: any): Promise<void> {
    let popUpTab = await getPopUpTab()
    if (!popUpTab || !popUpTab.id) return

    return chrome.tabs.sendMessage(popUpTab.id, message, responseCallback)
  }

  routeMessagesTo(subscribers: object) {
    for (const [messageType, responder] of Object.entries(subscribers)) {
      if (messageType == "xtendize:extension-token-requested") continue

      // if (!this.messageMap[messageType]) this.messageMap[messageType] = []
      // this.messageMap[messageType].push(responder)
      this.messageMap[messageType] = responder
    }
  }

  private routeInboundMessage(message: any, sender: any, sendResponse: any) {
    const { url } = this
    const { origin } = sender

    if (!url.startsWith(origin)) {
      console.debug("Origin mismatch: origin:", origin, "url:", url)
      return false
    }

    const { type } = message
    const action = this.getActionFor(type)
    return action(message, sender, sendResponse)
  }

  private getActionFor(messageType: string): Function {// Array<Function> {
    let action: Function = this.messageMap[messageType]
    return (!action) ? nullAction : action
  }
}
