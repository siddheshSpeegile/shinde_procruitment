import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// A pick-one list in a bottom sheet with a search box - for long lists like
// brands (160+) and sub-categories, where a plain dropdown would be too long.
// options: [{ value, label, sublabel? }]. onSelect(option) closes the sheet.
export default function SearchSelectModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchPlaceholder = "Search...",
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) =>
        `${o.label} ${o.sublabel || ""}`.toLowerCase().includes(q),
      )
    : options;

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.search}
            placeholder={searchPlaceholder}
            placeholderTextColor="#8a7c78"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
            ListEmptyComponent={
              <Text style={styles.empty}>{`No matches for "${query}"`}</Text>
            }
            renderItem={({ item }) => {
              const on = item.value === selectedValue;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setQuery("");
                    onSelect(item);
                  }}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text style={styles.optionSub}>{item.sublabel}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity onPress={close} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,18,16,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 26,
    maxHeight: "80%",
    gap: 12,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e5ddd8",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#1c1210" },
  search: {
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1c1210",
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionOn: { backgroundColor: "#f6e9e6" },
  optionText: { fontSize: 14.5, color: "#1c1210", fontWeight: "600" },
  optionTextOn: { color: "#8a3230", fontWeight: "800" },
  optionSub: { fontSize: 12, color: "#8a7c78", marginTop: 2 },
  empty: { textAlign: "center", color: "#8a7c78", paddingVertical: 20 },
  cancel: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#8a3230", fontSize: 15, fontWeight: "700" },
});
