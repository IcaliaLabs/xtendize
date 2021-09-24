///<reference types="chrome"/>

import MessageSender = chrome.runtime.MessageSender

export function routeMessagesToWindow(messageTypePrefix: string) {
  const logPrefix = `[${messageTypePrefix} extension]`
  const connStartReq = `${messageTypePrefix}:extension-connection-start-requested`
  console.debug(`${logPrefix} Requesting a connection to website...`)

  // TODO: Figure out the origin thing...
  const mOrigin = '*'

  const messageRouterKey = `${messageTypePrefix}MessageRouter` as string
  if (!(window as any)[messageRouterKey]) {
    console.debug(`${logPrefix} Installing window message routing as window.${messageRouterKey}...`);

    (window as any)[messageRouterKey] = (message: any, sender: MessageSender, sendResponse: any) => {
      console.debug("Posting message to window:", message)
      window.postMessage(message, mOrigin)  
    }

    chrome.runtime.onMessage.addListener((window as any)[messageRouterKey])
  }

  // Note that this script is injected into the app website loaded in the popup.
  // The first thing we'll do is to trigger the 'extension-token-requested'
  // to ask the extension for a token we will use to authenticate subsequent
  // messages from the extension:
  window.postMessage({ type: connStartReq }, mOrigin)
}