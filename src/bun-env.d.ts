export {};

declare global {
  interface ImportMeta {
    /** Bun: true when this file is the process entrypoint. */
    readonly main: boolean;
  }
}
