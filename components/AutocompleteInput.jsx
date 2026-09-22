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
export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
}) {
  const [focused, setFocused] = useState(false);

  const query = (value || "").trim().toLowerCase();
  const filtered = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query))
    : suggestions;

  // Don't show a dropdown offering the exact thing already typed - only
  // useful once there's something meaningfully different to pick from.
  const showDropdown =
    focused &&
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
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        // Delay so a tap on a suggestion registers before the list unmounts.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
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
                onPressIn={() => {
                  onChange(item);
                  setFocused(false);
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
