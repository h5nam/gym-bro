import { Capacitor } from "@capacitor/core";

/** 네이티브 앱(iOS/Android)에서 실행 중인지 확인 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** 현재 플랫폼 반환 ('ios' | 'android' | 'web') */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
