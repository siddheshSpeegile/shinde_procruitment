// Web (PWA): expo-image-picker gives the browser's own File object as
// asset.file, which FormData accepts directly.
export function photoPart(photo) {
  return photo.file;
}
