// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/use-color-scheme';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

// export default function RootLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }

import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getSession } from "../api/session";
import LoadingScreen from "../components/LoadingScreen";

// Screens anyone may open without being logged in: the splash (app/index)
// and Login. Every other screen - also when opened by typing its address in
// the web app - needs a saved login, or the user is sent to Login.
const PUBLIC_ROUTES = ["login"];

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const firstSegment = segments[0];
  const isPublic = !firstSegment || PUBLIC_ROUTES.includes(firstSegment);
  // null = still checking, true / false = logged in or not
  const [loggedIn, setLoggedIn] = useState(null);

  // Re-checked on every screen change, so logging in / out is picked up
  // straight away.
  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      setLoggedIn(!!session);
      if (!session && !isPublic) router.replace("/login");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSegment, segments.join("/")]);

  // A protected screen is covered (never shown) until the login is confirmed.
  const blocked = !isPublic && loggedIn !== true;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* After login (welcome animation) the Dashboard fades in */}
        <Stack.Screen name="dashboard" options={{ animation: "fade" }} />
      </Stack>
      {blocked ? (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      ) : null}
    </View>
  );
}
