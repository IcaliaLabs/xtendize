

function nullAction(message: any, sender: any, _sendResponse: any): void {
  const { type } = message
  console.warn(`Received unknown message type '${type}':`, message, sender)
  return
}

export function getActionFor(messageMap: { [name: string]: Function }, messageType: string): Function {// Array<Function> {
  let action: Function = messageMap[messageType]
  return (!action) ? nullAction : action
}
