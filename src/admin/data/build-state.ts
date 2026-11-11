/**
 * 记录当前浏览器中是否有“已提交到 GitHub、但还没构建”的修改。
 * 构建按钮会清除这个标记。它只是本地提示，不是仓库真实状态。
 */
const PENDING_KEY = 'hai1ro-build-pending';
const LAST_BUILD_KEY = 'hai1ro-last-build';

export function getPendingBuild(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function markPendingBuild(): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(PENDING_KEY, now);
  } catch {
    /* 隐私模式忽略 */
  }
  return now;
}

export function getLastBuild(): string | null {
  try {
    return localStorage.getItem(LAST_BUILD_KEY);
  } catch {
    return null;
  }
}

export function clearPendingBuild(): string {
  const now = new Date().toISOString();
  try {
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(LAST_BUILD_KEY, now);
  } catch {
    /* 隐私模式忽略 */
  }
  return now;
}
