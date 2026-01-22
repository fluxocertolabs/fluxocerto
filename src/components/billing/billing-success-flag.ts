const BILLING_SUCCESS_FLAG = 'fluxo-certo:billing-success-overlay'

export function readBillingSuccessFlag(): boolean {
  try {
    return window.sessionStorage.getItem(BILLING_SUCCESS_FLAG) === '1'
  } catch {
    return false
  }
}

export function setBillingSuccessFlag(): void {
  try {
    window.sessionStorage.setItem(BILLING_SUCCESS_FLAG, '1')
  } catch {
    // ignore storage errors
  }
}

export function clearBillingSuccessFlag(): void {
  try {
    window.sessionStorage.removeItem(BILLING_SUCCESS_FLAG)
  } catch {
    // ignore
  }
}


