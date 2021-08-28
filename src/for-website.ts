import { getActionFor } from "./action-mapping"

function extensionIsActive() {
  return (
    typeof chrome !== 'undefined' ||
    typeof chrome.runtime !== 'undefined'
  )
}

export class Extension {
  extensionId: string
  messageTypePrefix: string
  actionMap: { [name: string]: Function } // { [name: string]: Array<Function> }

  constructor(args: any) {
    this.extensionId = args.extensionId
    this.messageTypePrefix = args.messageTypePrefix

    const connStartReq = `${this.messageTypePrefix}:extension-connection-start-requested`
    this.actionMap = {}
    this.actionMap[connStartReq] = this.requestTokenFromExtension.bind(this)
  }

  start() {
    console.log("Listening to window events posted by the extension...")
    window.addEventListener(
      "message",
      this.routeIncomingExtensionMessages.bind(this),
      false
    )
  }

  routeMessagesTo(subscribers: { [name: string]: Function }) {
    const connStartReq = `${this.messageTypePrefix}:extension-connection-start-requested`
    for (const [messageType, responder] of Object.entries(subscribers)) {
      if (messageType == connStartReq) continue
      this.actionMap[messageType] = responder
    }
  }

  sendMessage(message: any, options: chrome.runtime.MessageOptions, responseCallback?: ((response: any) => void) | undefined) {
    if (!extensionIsActive()) {
      console.warn("The extension is not active")
      return
    }

    return chrome.runtime.sendMessage(
      this.extensionId,
      message,
      options,
      responseCallback
    )
  }

  private routeIncomingExtensionMessages(event: any) {
    // We only accept messages from ourselves
    if (event.source != window) return

    const message = event.data
    const sender = null
    const sendResponse = null
    const { type } = message

    if (
      typeof type === 'undefined' ||
      typeof type !== 'string' ||
      !type.startsWith(this.messageTypePrefix)
    ) return

    const action = getActionFor(this.actionMap, type)
    return action(message, sender, sendResponse)
  }

  // Requests a token from the extension:
  private requestTokenFromExtension(message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) {
    console.debug("requestTokenFromExtension:", message)
    const { messageTypePrefix } = this
    this.sendMessage(
      { type: `${messageTypePrefix}:extension-token-requested` },
      {},
      (token: string) => {
        console.debug(`[${messageTypePrefix} website] Received token from extension:`, token)
        window.sessionStorage.setItem(`${messageTypePrefix}:extension-token`, token)
      }
    )
  }
}
