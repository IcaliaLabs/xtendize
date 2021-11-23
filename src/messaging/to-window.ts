///<reference types="chrome"/>

import MessageSender = chrome.runtime.MessageSender

export function routeMessagesToWindow(messageTypePrefix: string) {
  const debug = (message: any, ...extra: any[]) => {
    console.debug(
      `[${messageTypePrefix} extension window messaging router] ${message}`,
      ...extra
    )
  }

  const camelize = (text: string): string => {
    return text.replace(/^([A-Z])|[\s-_]+(\w)/g, (_match, p1, p2, _offset) => {
      if (p2) return p2.toUpperCase()
      return p1.toLowerCase()
    })
  }

  const connStartReq = `${messageTypePrefix}:extension-connection-start-requested`
  debug(`Requesting a connection to website...`)

  // TODO: Figure out the origin thing...
  const mOrigin = '*'

  const messageRouterKey = `${camelize(messageTypePrefix)}MessageRouter`
  const installedMessageRouter = (window as any)[messageRouterKey]
  if (installedMessageRouter) {
    debug("Message router already installed.")
    return
  }

  debug(`Installing window message routing as window.${messageRouterKey}...`)
  const listener = (message: any, sender: MessageSender, sendResponse: any) => {
    debug("Posting message to window:", message)
    window.postMessage(message, mOrigin)
  }

  chrome.runtime.onMessage.addListener(listener); // Why is the semicolon required?
  (window as any)[messageRouterKey] = listener

  // Note that this script is injected into the app website loaded in the popup.
  // The first thing we'll do is to trigger the 'extension-token-requested'
  // to ask the extension for a token we will use to authenticate subsequent
  // messages from the extension:
  window.postMessage({ type: connStartReq }, mOrigin)
}
