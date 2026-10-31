// Web (PWA): browsers can't write into the phone gallery directly, so after a
// product is saved its CAMERA photos are downloaded. On Android, Chrome puts
// downloads in the Downloads folder, which the Gallery / Google Photos app
// shows. (Chrome may ask once to "allow multiple downloads".) iPhone Safari
// sends downloads to the Files app instead - there the "Save to Gallery"
// button under each photo is the way to get them into Photos.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function saveCameraPhotos(photos, baseName = "shinde-photo") {
  const camera = photos.filter((p) => p.fromCamera && p.file);
  for (let i = 0; i < camera.length; i++) {
    const file = camera[i].file;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}-${i + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the browser a moment between files, then free the memory
    await wait(400);
    URL.revokeObjectURL(url);
  }
}
