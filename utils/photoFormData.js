import { File } from "expo-file-system";

// Phone (Android/iOS): the upload part for a picked/captured photo - the same
// expo-file-system File the screens always used (SDK 57's fetch needs it for
// FormData). The web build loads photoFormData.web.js instead.
export function photoPart(photo) {
  return new File(photo.uri);
}
