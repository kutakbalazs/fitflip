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
  if (!isNativePlatform()) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      // The plugin hands back JPEG regardless of what the sensor produced,
      // which sidesteps the HEIC conversion the web path needs.
      quality: 85,
      allowEditing: false,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo.webPath) return null;

    // The rest of the pipeline expects a File, same as the button produces.
    const blob = await fetch(photo.webPath).then((r) => r.blob());
    const ext = photo.format || "jpeg";
    return new File([blob], `scan.${ext}`, { type: blob.type || `image/${ext}` });
  } catch {
    // Cancelling the camera rejects. That is a normal outcome, not an error.
    return null;
  }
}
