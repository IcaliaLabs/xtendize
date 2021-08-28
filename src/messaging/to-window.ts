///<reference types="chrome"/>

import MessageSender = chrome.runtime.MessageSender

export function routeMessagesToWindow(messageTypePrefix: string) {
  const logPrefix = `[${messageTypePrefix}]`
  const extTokenReq = `${messageTypePrefix}:extension-token-requested`
  console.log(`${logPrefix} Triggering the "${extTokenReq}" message:`)

  // Note that this script is injected into the app website loaded in the popup.
  // The first thing we'll do is to trigger the 'extension-token-requested'
  // to ask the extension for a token we will use to authenticate subsequent
  // messages from the extension:
  // TODO: Figure out the origin thing...
  const mOrigin = '*'
  window.postMessage({ type: extTokenReq }, mOrigin)

  // Listen for incoming messages, and forward them to enginear site's listener:
  chrome.runtime.onMessage.addListener((message: any, sender: MessageSender, sendResponse: any) => {
    window.postMessage(message, mOrigin)
  })
}