import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Share as CapShare } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Network } from '@capacitor/network';
import type jsPDF from 'jspdf';

/**
 * Checks if running inside native Android / iOS Capacitor wrapper
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

let lastBackPressTime = 0;

/**
 * Initialize native mobile features (Status Bar, Multi-Level Hardware Back Button)
 */
export function initNativePlatform(
  onNavigateBack: () => boolean,
  showToast?: (msg: string) => void
): () => void {
  if (!isNativePlatform()) return () => {};

  // 1. Configure Native Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#1656D6' }).catch(() => {});
  } catch (e) {
    console.warn('[NativeBridge] StatusBar init error:', e);
  }

  // 2. Multi-Level Android Hardware Back Button
  let backListenerRemove: (() => void) | null = null;
  CapApp.addListener('backButton', () => {
    // A. Check if modal or nested screen was closed
    const handled = onNavigateBack();
    if (handled) {
      lastBackPressTime = 0;
      return;
    }

    // B. If at root screen, require double-press within 2 seconds to exit
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      CapApp.exitApp();
    } else {
      lastBackPressTime = now;
      if (showToast) {
        showToast('Press BACK again to exit');
      }
    }
  }).then((handle) => {
    backListenerRemove = () => handle.remove();
  }).catch((e) => {
    console.warn('[NativeBridge] BackButton listener error:', e);
  });

  return () => {
    if (backListenerRemove) backListenerRemove();
  };
}

/**
 * Universal PDF Save & Share Helper
 * Native Android Flow: jsPDF -> Base64 -> Filesystem.writeFile (Cache) -> Android Share Sheet
 * Web Flow: jsPDF doc.save() / Browser Blob
 */
export async function saveAndSharePdf(
  doc: jsPDF,
  fileName: string,
  title: string = 'LabourBook Report'
): Promise<void> {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  if (isNativePlatform()) {
    try {
      // 1. Get raw base64 string from jsPDF
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1] || dataUri;

      // 2. Write PDF to device cache
      const fileResult = await Filesystem.writeFile({
        path: cleanFileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // 3. Open Android Native Share Sheet (WhatsApp, Drive, Gmail, Files, etc.)
      await CapShare.share({
        title: title,
        text: `Here is the ${title} generated with LabourBook.`,
        url: fileResult.uri,
        dialogTitle: `Share ${cleanFileName}`
      });
      return;
    } catch (err) {
      console.warn('[NativeBridge] Native PDF share failed, falling back to browser save:', err);
    }
  }

  // Web fallback: standard browser download
  doc.save(cleanFileName);
}

/**
 * Universal Clipboard Copy Helper
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Native Clipboard.write failed:', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    return false;
  }
}

/**
 * Universal Network Status Change Listener
 */
export function listenToNetworkChanges(
  onOnline: () => void,
  onOffline?: () => void
): () => void {
  if (isNativePlatform()) {
    let handleRemove: (() => void) | null = null;
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        onOnline();
      } else if (onOffline) {
        onOffline();
      }
    }).then((h) => {
      handleRemove = () => h.remove();
    });

    return () => {
      if (handleRemove) handleRemove();
    };
  }

  // Web fallback
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline && onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Universal Share Helper (Native Android Share Sheet / Web Share API / WhatsApp fallback)
 */
export async function universalShare(options: {
  title: string;
  text: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  // 1. Native Capacitor Share
  if (isNativePlatform()) {
    try {
      await CapShare.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share with LabourBook'
      });
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Native share cancelled or failed:', e);
      return false;
    }
  }

  // 2. Web Share API fallback
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url || window.location.href
      });
      return true;
    } catch (e) {
      // User cancelled
      return false;
    }
  }

  // 3. Fallback to WhatsApp Direct Web URL
  const shareText = `${options.title}\n\n${options.text}${options.url ? '\n' + options.url : ''}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(whatsappUrl, '_blank');
  return true;
}
