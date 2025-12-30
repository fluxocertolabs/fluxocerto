/**
 * Promise helpers.
 */

/**
 * Wrap a promise with a timeout that rejects after `timeoutMs`.
 *
 * Note: This does NOT cancel the original promise; it only bounds how long the caller waits.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId)
        reject(error)
      })
  })
}


