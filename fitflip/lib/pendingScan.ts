// In-memory hand-off for a photo captured via the floating scan button.
//
// The button lives on non-home pages; the scan flow lives on the home page.
// Opening the camera must happen in the SAME user gesture as the tap (mobile
// browsers block a programmatic camera-open after a navigation), so the
// button captures the photo first, stashes the File here, then navigates to
// home — which picks it up on mount. Client-side navigation keeps this module
// alive, so the File survives the route change (a File can't go in
// sessionStorage).

let pendingFile: File | null = null;

export function setPendingScanFile(file: File): void {
  pendingFile = file;
}

export function takePendingScanFile(): File | null {
  const f = pendingFile;
  pendingFile = null;
  return f;
}
