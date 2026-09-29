import { isNativePlatform } from "@/lib/native";

/**
 * Open the camera without a user gesture.
 *
 * The floating scan button can't do this: it opens the camera by clicking a
 * hidden `<input capture>`, and browsers only honour that inside the gesture
 * that triggered it. A tap on a home-screen widget is not that gesture — by
 * the time the app has launched and routed, the gesture is long gone.
 *
 * The native camera has no such rule, so the widget path goes through the
 * plugin instead. The existing button is deliberately left alone: it works,
 * and two paths that both work beat one path that has to serve both.
 */
export async function captureViaNativeCamera(): Promise<File | null> {
  return capture("camera");
}

/**
 * Open the photo library directly.
 *
 * A plain `<input type="file" accept="image/*">` makes iOS ask first —
 * "Photo Library / Take Photo / Choose File" — which is a question the user
 * already answered by pressing the gallery button rather than the shutter.
 */
export async function pickFromNativeGallery(): Promise<File | null> {
  return capture("photos");
}

async function capture(from: "camera" | "photos"): Promise<File | null> {
  if (!isNativePlatform()) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

    const photo = await Camera.getPhoto({
      source: from === "camera" ? CameraSource.Camera : CameraSource.Photos,
      // DataUrl, not Uri. A Uri result hands back capacitor://localhost/...,
      // and this page is served from https://www.fitflip.app — a different
      // origin, so fetching that path fails. The failure landed in the catch
      // below and returned null, which this flow reads as "the user cancelled":
      // the camera opened, the photo was taken, and the app went home having
      // silently dropped it.
      resultType: CameraResultType.DataUrl,
      // The plugin hands back JPEG regardless of what the sensor produced,
      // which sidesteps the HEIC conversion the web path needs.
      quality: 85,
      allowEditing: false,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo.dataUrl) return null;

    // The rest of the pipeline expects a File, same as the button produces.
    // Decoding the data URL in-page needs no network and no origin to match.
    const blob = dataUrlToBlob(photo.dataUrl);
    if (!blob) return null;
    const ext = photo.format || "jpeg";
    return new File([blob], `scan.${ext}`, { type: blob.type || `image/${ext}` });
  } catch {
    // Cancelling the camera rejects. That is a normal outcome, not an error.
    return null;
  }
}

/** Decode a `data:` URL without going through fetch(). */
function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(0, comma);
  const mime = header.match(/^data:([^;]+)/)?.[1] ?? "image/jpeg";
  if (!header.includes(";base64")) return null;
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}
