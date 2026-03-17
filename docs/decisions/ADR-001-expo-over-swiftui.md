# ADR-001: Expo/React Native Over Native SwiftUI

**Date:** 2025-03-17
**Status:** Accepted

## Context

The original architecture sketch assumed a native SwiftUI app. The target user is a Hong Kong renter — iPhone penetration in HK is extremely high (~70%), making iOS the primary platform. However:

- The project also serves as a beginner tutorial. A React-based mobile framework is accessible to a much larger audience of beginners than SwiftUI.
- The backend needs to be reached over HTTP from both iOS and potentially Android in the future.

## Decision

Use **Expo (React Native)** with Expo Router file-system routing for the mobile app, targeting iOS as the primary platform with Android as secondary.

## Consequences

**Good:**
- Much larger audience of tutorial readers (React ecosystem vs Swift ecosystem).
- Expo's managed workflow reduces friction: no Xcode required for basic development, OTA updates possible.
- JavaScript/TypeScript shared type language with Node.js backend code means domain types can be shared.
- Expo Router's file-system routing matches Next.js patterns — familiar to web developers.

**Bad:**
- Native features (Face ID, camera raw API, SF Symbols) need to go through Expo wrappers which can lag behind native SDK releases.
- Liquid glass tab bar requires `expo-router/unstable-native-tabs` + `expo-glass-effect` — experimental APIs with potential breaking changes.
- Cannot use SwiftData for persistence — must use `expo-sqlite` or a backend API instead.

**Mitigations:**
- Use `isLiquidGlassAvailable()` guard so the app degrades gracefully on older iOS and Android.
- SF Symbols wrapped in `Platform.OS === "ios"` guard with Feather icon fallback.

## Tutorial Note

This is the most consequential architectural decision. A beginner reading this project will ask: "Why Expo instead of SwiftUI?" The answer is accessibility: the tutorial serves more people in a language more people know.
