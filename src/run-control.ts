/** Turns Ctrl+C during processing into a graceful stop. */
export function createRunControl(): { isCancelled: () => boolean; dispose: () => void } {
  let cancelled = false;
  const onSignal = (): void => { cancelled = true; };
  process.on('SIGINT', onSignal);
  return { isCancelled: () => cancelled, dispose: () => process.off('SIGINT', onSignal) };
}
