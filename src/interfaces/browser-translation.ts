export interface TranslatorInstance {
  translate(text: string): Promise<string>;
  destroy(): void;
}
export interface TranslatorApi {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void;
  }): Promise<TranslatorInstance>;
}
export interface BrowserTranslationOptions { original: string; label: string }
export interface BrowserTranslationState { source: string; text: string | null; status: string | null }
