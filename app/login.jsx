// import { LinearGradient } from "expo-linear-gradient";
// import { useRouter } from "expo-router";
// import React, { useState } from "react";
// import {
//     ActivityIndicator,
//     Image,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
// } from "react-native";
// import { apiFetch } from "../api/config";

// export default function LoginScreen() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const router = useRouter();

//   const handleLogin = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const data = await apiFetch("/auth/login", {
//         method: "POST",
//         body: JSON.stringify({ username, password }),
//       });
//       if (data.success) {
//         router.replace("/dashboard");
//       } else {
//         setError(data.message || "Login failed");
//       }
//     } catch (err) {
//       setError(
//         "Could not reach server. Check your backend is running and the LAN IP in api/config.ts is correct.",
//       );
//     }
//     setLoading(false);
//   };

//   return (
//     <View style={styles.container}>
//       <Image
//         source={require("../assets/images/logo.png")}
//         style={styles.logo}
//         resizeMode="contain"
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         placeholderTextColor="#8a7c78"
//         value={username}
//         onChangeText={setUsername}
//         autoCapitalize="none"
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         placeholderTextColor="#8a7c78"
//         value={password}
//         onChangeText={setPassword}
//         secureTextEntry
//       />

//       {error ? <Text style={styles.error}>{error}</Text> : null}

//       <TouchableOpacity onPress={handleLogin} disabled={loading}>
//         <LinearGradient
//           colors={["#3a1516", "#8a4844", "#c98f86"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={styles.button}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>Login</Text>
//           )}
//         </LinearGradient>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f3f0",
//     justifyContent: "center",
//     padding: 24,
//   },
//   logo: { width: "80%", height: 80, alignSelf: "center", marginBottom: 40 },
//   input: {
//     borderWidth: 1.5,
//     borderColor: "#1c1c1c",
//     borderRadius: 10,
//     padding: 14,
//     fontSize: 15,
//     backgroundColor: "#fff",
//     marginBottom: 14,
//   },
//   button: { borderRadius: 14, padding: 16, alignItems: "center" },
//   buttonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
//   error: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
// });

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch } from "../api/config";
import { saveSession } from "../api/session";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (data.success) {
        await saveSession(data.data);
        router.replace("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(
        "Could not reach server. Check your backend is running and the LAN IP in api/config.js is correct.",
      );
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#8a7c78"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8a7c78"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={handleLogin} disabled={loading}>
        <LinearGradient
          colors={["#3a1516", "#8a4844", "#c98f86"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f3f0",
    justifyContent: "center",
    padding: 24,
  },
  logo: { width: "80%", height: 80, alignSelf: "center", marginBottom: 40 },
  input: {
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  button: { borderRadius: 14, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  error: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
});
