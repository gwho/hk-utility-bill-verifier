/**
 * FILE: app/(tabs)/_layout.tsx
 * ROLE: Defines the root tab navigation for the entire app.
 * WHY: Five tabs map directly to the five core user workflows:
 *   1. Dashboard  — overview and trends
 *   2. Bills      — manage imported documents
 *   3. Reports    — discrepancy comparison results
 *   4. Regulations— HK tenancy & utility rules
 *   5. Learn      — in-app architecture tutorial
 *
 * ARCHITECTURE DECISION (ADR-001): We use NativeTabs on iOS 26+ for the
 * liquid-glass tab bar. On older devices we fall back to the BlurView-based
 * classic Tabs. Both paths register the same five named routes so Expo Router
 * can resolve them identically.
 *
 * WHY NativeTabs: iOS 26 NativeTabs gives platform-native appearance with
 * liquid glass without any custom styling. It is the market expectation for
 * 2025/2026 iOS apps and requires zero custom CSS.
 */

import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

/**
 * NativeTabLayout — iOS 26+ path.
 * Uses SF Symbols for tab icons (system-native, scales with accessibility).
 * WHY SF Symbols: They adapt to Dynamic Type, follow iOS conventions, and
 * are sharper than third-party icon fonts at every resolution.
 */
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bills">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Bills</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <Icon sf={{ default: "exclamationmark.triangle", selected: "exclamationmark.triangle.fill" }} />
        <Label>Reports</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="regulations">
        <Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} />
        <Label>HK Rules</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Learn</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/**
 * ClassicTabLayout — iOS < 26 and Android/Web path.
 * Uses BlurView on iOS for frosted-glass tab bar.
 * On web, a solid View background prevents BlurView crashes.
 *
 * WHY Platform.OS checks instead of Platform.select(): Platform.select()
 * returns undefined for 'web' if the key is missing — explicit checks are
 * safer and more readable.
 *
 * ERROR LOG: First attempt used SymbolView on all platforms → crashed on
 * Android ("RNTSymbolView is not a view"). Fix: wrap in Platform.OS === "ios"
 * ternary with Feather fallback.
 */
function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.tabBar,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: C.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.tabBar }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="bar-chart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.text.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="exclamationmark.triangle.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="alert-triangle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="regulations"
        options={{
          title: "HK Rules",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="building.columns.fill" tintColor={color} size={22} />
            ) : (
              <MaterialCommunityIcons name="bank" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="book-open" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
