import { getActionFor } from "./action-mapping"

function extensionIsActive() {
  return (
    typeof chrome !== 'undefined' ||
    typeof chrome.runtime !== 'undefined'
  )
}

export class Extension {
  extensionId: string
  tokenStorageKey: string
  messageTypePrefix: string
  actionMap: { [name: string]: Function } // { [name: string]: Array<Function> }

  constructor(args: any) {
    this.extensionId = args.extensionId
    this.messageTypePrefix = args.messageTypePrefix
    this.tokenStorageKey = `${this.messageTypePrefix}:extension-token`

    const connStartReq = `${this.messageTypePrefix}:extension-connection-start-requested`
    this.actionMap = {}
    this.actionMap[connStartReq] = this.handleConnectionStartRequest.bind(this)
  }

  start() {
    this.debug("Waiting for connection requests from extension...")
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

  stopRoutingMessagesTo(subscribers?: { [name: string]: Function }) {
    if (!subscribers) return this.actionMap = {}

    for (const [messageType, _responder] of Object.entries(subscribers)) {
      delete this.actionMap[messageType]
    }
  }

  sendMessage(message: any, options: chrome.runtime.MessageOptions, responseCallback?: ((response: any) => void) | undefined) {
    if (!extensionIsActive()) {
      this.warn("The extension is not active")
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
  private handleConnectionStartRequest(message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) {
    const { messageTypePrefix } = this
    this.debug("Received connection request. Requesting token...")

    this.sendMessage(
      { type: `${messageTypePrefix}:extension-token-requested` },
      {},
      (token: string) => {
        this.debug(`Received token from extension: "${token}". Connection started.`)
        window.sessionStorage.setItem(this.tokenStorageKey, token)

        if (document) {
          const eventName = `${messageTypePrefix}:extension-connection-started`
          document.dispatchEvent(new Event(eventName))
        }
      }
    )
  }

  private debug(message: any, ...extra: any[]) {
    console.debug(`[${this.messageTypePrefix} website] ${message}`, ...extra)
  }

  private warn(message: any, ...extra: any[]) {
    console.warn(`[${this.messageTypePrefix} website] ${message}`, ...extra)
  }
}
