import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Each option row is a fixed height so "show exactly 4, scroll for more"
// is precise rather than approximate.
const ROW_HEIGHT = 42;
const VISIBLE_ROWS = 4;

// A plain text input that shows a filtered dropdown of existing DB values
// as the user types, so they can pick an existing one with a tap instead
// of retyping it (and risking a near-duplicate like "Red" vs "red "). The
// user can still type anything not in the list - free text is never
// blocked, it's just not suggested.
//
// suggestions: array of strings already in the DB for this field (e.g.
// every existing category name). value/onChange: same contract as a
// plain controlled TextInput.
//
// IMPORTANT: any ScrollView this is placed inside must set
// keyboardShouldPersistTaps="handled". Otherwise, while the keyboard is
// open, the first tap on a suggestion only dismisses the keyboard - the
// suggestion never receives the tap, and the list then closes on blur.
export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
}) {
  // Open while the input is focused, and re-opened on every keystroke -
  // picking a suggestion closes the list but leaves the input focused, so
  // relying on focus alone meant the list never came back when the user
  // kept typing (the "suggestions only show the first time" bug).
  const [open, setOpen] = useState(false);

  const query = (value || "").trim().toLowerCase();
  const filtered = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query))
    : suggestions;

  // Don't show a dropdown offering the exact thing already typed - only
  // useful once there's something meaningfully different to pick from.
  const showDropdown =
    open &&
    filtered.length > 0 &&
    !(filtered.length === 1 && filtered[0].toLowerCase() === query);

  // Only reserve scroll height for as many rows as actually exist, up to
  // the 4-row cap - so a 2-suggestion list isn't padded with empty space.
  const dropdownHeight = Math.min(filtered.length, VISIBLE_ROWS) * ROW_HEIGHT;

  return (
    <View>
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#8a7c78"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay so a tap on a suggestion registers before the list unmounts.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {showDropdown && (
        <View style={[styles.dropdown, { height: dropdownHeight }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {filtered.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.option}
                // onPress (not onPressIn): fires only on a completed tap,
                // so dragging to scroll the list never picks a value.
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText} numberOfLines={1}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  textInput: {
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1c1210",
    backgroundColor: "#fff",
  },
  dropdown: {
    borderWidth: 1.5,
    borderColor: "#e5ddd8",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginTop: 4,
    overflow: "hidden",
  },
  option: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0e9e6",
  },
  optionText: { fontSize: 13.5, color: "#1c1210" },
});
