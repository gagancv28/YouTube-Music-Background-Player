# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# react-native-track-player & KotlinAudio
-keep class com.doublesymmetry.** { *; }
-dontwarn com.doublesymmetry.**
-dontwarn com.google.android.exoplayer2.**

# react-native-webview
-keep public class com.reactnativecommunity.webview.** { *; }
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager {
  public <init>(...);
}
