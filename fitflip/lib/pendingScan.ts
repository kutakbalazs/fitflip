// In-memory hand-off for a photo captured outside the home screen.
//
// The camera must open in the SAME user gesture as the tap (mobile browsers
// block a programmatic camera-open after a navigation), so the caller
// captures the photo first, stashes the File here, then navigates home —
// which picks it up. Client-side navigation keeps this module alive, so the
// File survives the route change (a File can't go in sessionStorage).
//
// The pickup is a subscription rather than only a mount-time read. Reading it
// on mount alone assumes the home screen mounts *after* the file is set, and
// that is not always true: the widget's /scan/new hands off to a home screen
// that may already be mounted, and the floating button does the same when it
// is pressed on the home screen itself. In those cases the file was set with
// nobody listening and simply sat there — the camera opened, the photo was
// taken, and the app returned home having quietly done nothing.

let pendingFile: File | null = null;
const listeners = new Set<(file: File) => void>();

export function setPendingScanFile(file: File): void {
  // Hand it straight to a live listener if there is one; only park it when
  // there is nobody to take it yet.
  const [first] = listeners;
  if (first) {
    first(file);
    return;
  }
  pendingFile = file;
}

export function takePendingScanFile(): File | null {
  const f = pendingFile;
  pendingFile = null;
  return f;
}

/**
 * Listen for photos captured elsewhere.
 *
 * Returns an unsubscribe function. On subscribing, any file already parked is
 * delivered immediately, so a late listener never misses one.
 */
export function onPendingScanFile(fn: (file: File) => void): () => void {
  listeners.add(fn);
  const parked = takePendingScanFile();
  if (parked) fn(parked);
  return () => {
    listeners.delete(fn);
  };
}
