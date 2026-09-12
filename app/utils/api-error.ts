export function apiErrorCode(error: unknown) {
  const body = (error as { data?: { data?: { code?: string } } })?.data
  return body?.data?.code
}

export function apiErrorMessage(error: unknown, fallback = '操作失败，请稍后再试') {
  const body = (error as { data?: { message?: string, statusMessage?: string } })?.data
  return body?.message || body?.statusMessage || fallback
}
