import { Text, TouchableOpacity } from "react-native";

// Web (PWA): browsers can't save into the phone's gallery by themselves, so
// this opens the phone's share sheet - iPhone offers "Save Image" (to Photos),
// Android offers Gallery/Photos. Where sharing files isn't supported (most
// desktop browsers) it downloads the photo instead.
export default function SaveToGalleryButton({ file, style }) {
  if (!file) return null;

  const save = async () => {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Product photo" });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // user closed the share sheet
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "shinde-photo.jpg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TouchableOpacity onPress={save} style={style}>
      <Text style={{ color: "#8a3230", fontSize: 11, fontWeight: "700" }}>
        Save to Gallery
      </Text>
    </TouchableOpacity>
  );
}
