# Rules: build

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### BD01 Android Link Time Optimization build setting enabled
- Level: Warning
- Scope: any
- When: android
- Files: ProjectSettings.asset, *.asset
- Code: any
- Check: MANUAL
- Reason: The setting (None or Thin) swaps in a ThinLTO build of the engine library only, and requires Strip Engine Code disabled. On a Pixel 8a it improved 3 of 13 workloads clearly (geometric mean -2.46%), while Strip Engine Code off added 5.67 MB to the APK, 20.3 MB installed, and 18.0 MB resident, 8.0 MB of it hard to reclaim.
- Fix: Leave it at None and keep Strip Engine Code enabled. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD02 Strip Engine Code disabled
- Level: Warning
- Scope: any
- When: il2cpp
- Code: any
- Check: EDITOR
- Reason: Strip Engine Code is disabled while an IL2CPP target is built. Measured on a Pixel 8a: native libraries +14.65 MB uncompressed, APK +5.67 MB, install +20.3 MB, resident memory +18.0 MB, and `libil2cpp.so` +3.89 MB because managed engine modules are kept too. It is separate from the Managed Stripping Level.
- Fix: Keep it enabled in shipping builds; measure size and memory first if something requires it off. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD03 SetAdditionalIl2CppArgs without save and restore
- Level: Critical
- Scope: any
- When: il2cpp
- Files: *.cs
- Code: editor
- Check: `SetAdditionalIl2CppArgs\s*\(`
- Reason: The call replaces the existing arguments rather than appending, and the value persists in the project settings, so other builds silently lose or inherit flags.
- Fix: Read `GetAdditionalIl2CppArgs()` first, append to it, build, and restore the saved value in `finally`. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD04 Master C++ configuration on Android
- Level: Info
- Scope: any
- When: android
- Code: any
- Check: EDITOR
- Reason: C++ Compiler Configuration is Master for Android. Its CPU gain comes from the ThinLTO it enables: on a synthetic benchmark Release with manual ThinLTO reached the same time (-20.9%) with a `libil2cpp.so` about 13.5% smaller (38.16 MB against 44.14 MB) and a cold build of 71 s against 86 s.
- Fix: Use Release and add ThinLTO from the build script, after confirming scripting is a large share of the frame. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD05 Full LTO
- Level: Critical
- Scope: any
- When: il2cpp
- Files: *.cs, *.yml, *.yaml, *.sh, *.ps1
- Code: any
- Check: `-flto(?!=thin)`
- Reason: Full LTO links everything in one process. On a real title (`libil2cpp.so` of 189 MB) the link reached 20 GB and was killed after 2,903 s; on a synthetic benchmark it matched ThinLTO's CPU time while the cold build went from 71 s to 247 s. IL2CPP LTO Mode Full in Player Settings has the same cost.
- Fix: Use `-flto=thin`, and leave IL2CPP LTO Mode at Thin. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD06 -O3 combined with ThinLTO
- Level: Warning
- Scope: any
- When: android
- Files: *.cs, *.yml, *.yaml, *.sh, *.ps1
- Code: any
- Check: `compiler-flags.*-O3`
- Reason: On a Pixel 8a, adding `-O3` to ThinLTO changed CPU time by 0.3% while `libil2cpp.so` grew 23.4% (38.16 MB to 47.08 MB).
- Fix: Drop `-O3` and keep ThinLTO on the Release default (`-Os` on Android). See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD07 Whole-program devirtualization flags
- Level: Info
- Scope: any
- When: il2cpp
- Files: *.cs, *.yml, *.yaml, *.sh, *.ps1
- Code: any
- Check: `-f(whole-program-vtables|split-lto-unit)`
- Reason: IL2CPP output has no C++ virtual calls: managed virtual and interface calls go through runtime method tables. Measured on a Pixel 8a, the flag gave no CPU change, 400 bytes less code, and the same build time.
- Fix: Remove the flags. Cut indirect calls in C# instead: `sealed` types and concrete types on hot paths. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD08 Tuned import-instr-limit
- Level: Info
- Scope: any
- When: il2cpp
- Files: *.cs, *.yml, *.yaml, *.sh, *.ps1
- Code: any
- Check: `import-instr-limit=\d+`
- Reason: Values of 30, 100 (the clang default), and 300 showed no measurable difference in CPU time, size, or build time.
- Fix: Remove the flag and keep the default.
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD09 ThinLTO on iOS
- Level: Warning
- Scope: any
- When: ios
- Files: *.cs, *.yml, *.yaml, *.sh, *.ps1
- Code: any
- Check: `-flto=thin`
- Reason: On an iPhone 13 a real title's CPU change stayed within noise, while the Xcode `Build ipa` step went from 357 s to 3,094 s (about 9 times), UnityFramework grew 24.31%, and the ipa 5.60%. The synthetic benchmark's -23.77% did not carry over. Android hits are expected: confirm the flag sits in an iOS branch.
- Fix: Keep ThinLTO to Android builds. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD10 Xcode LLVM_LTO set for IL2CPP code
- Level: Warning
- Scope: any
- When: ios
- Files: *.cs, *.xcconfig, *.pbxproj
- Code: any
- Check: `LLVM_LTO`
- Reason: The GameAssembly target only runs a script that invokes IL2CPP, so Xcode's `LLVM_LTO` never reaches generated code; only IL2CPP arguments do. It is legitimate for native plugins Xcode compiles.
- Fix: Remove the setting unless a native plugin needs it. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD11 LTO not verified after the build
- Level: Warning
- Scope: any
- When: android
- Files: *.yml, *.yaml, *.sh, *.ps1, *Build*.cs
- Code: any
- Check: MANUAL
- Reason: A successful build proves nothing about LTO. The Android Link Time Optimization setting silently builds as None unless the backend is IL2CPP, Strip Engine Code is off, and the build is not a Development build, and manual flags can reach only the compile or only the link step.
- Fix: After the build, check that `-flto=thin` appears in both the compile and link commands of `Library/Bee/Player*.dag.json` and that a generated `.o` starts with `42 43 c0 de`. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)

### BD12 Reflection on types only it reaches
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `Type\.GetType\(|Activator\.CreateInstance\(|\.GetMethod\(`
- Reason: With managed stripping at Medium or High (IL2CPP, or CoreCLR once raised from Disabled), a type named by a non-constant string is removed and `Type.GetType` returns null; a method reached only by `GetMethod` is removed from a kept type. A constant string literal or a `const` field is traced and kept.
- Fix: Preserve the type and member, or replace the lookup with a Source Generator that emits static calls. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD13 DI container constructing through reflection
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.(Register|Bind|Resolve)<`
- Reason: At High, `Register<INotificationService, NotificationService>()` kept the type but stripped its default constructor, and resolving threw `MissingMethodException: Default constructor not found`. Containers that scan assemblies lose whole implementation types.
- Fix: Preserve constructors of registered types, or switch the container to source-generated injection. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD14 AssetBundle loaded outside Addressables
- Level: Critical
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `AssetBundle\.LoadFrom\w*\(`
- Reason: Bundles built separately are not stripping roots, so a type only their content uses is removed. A Timeline asset in a bundle the player never referenced failed to load with "The referenced script (UnityEngine.Timeline.TimelineAsset) on this Behaviour is missing!", at Minimal and at High alike, so no stripping level fixes it.
- Fix: Load through Addressables, whose content build generates the matching `link.xml`; otherwise preserve those assemblies in `link.xml` or from an `IUnityLinkerProcessor`. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD15 Whole assembly preserved in link.xml
- Level: Info
- Scope: any
- When: -
- Files: link.xml
- Code: any
- Check: `<assembly[^>]*preserve="all"`
- Reason: `preserve="all"` on an assembly cancels stripping for all of it. It helps isolate a stripping failure, not as a lasting fix.
- Fix: Narrow the entry to the types or members that need it. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD16 [Preserve] on only the type or only the method
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\[(UnityEngine\.Scripting\.)?Preserve\b`
- Reason: On a type, `[Preserve]` keeps the type and its default constructor but strips its methods; on a method, it keeps the type and that method but not the constructor. Reflection that creates and then invokes failed with `MissingMethodException` at High.
- Fix: Put it on both the type and the invoked members, or use `[RequireImplementors]` on an interface or `[RequireDerived]` on a base class. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD18 Raised stripping level without player-build tests
- Level: Warning
- Scope: any
- When: -
- Files: ProjectSettings.asset
- Code: any
- Check: MANUAL
- Reason: Over-stripping shows only in the built player; the Editor runs unstripped, so the failure surfaces late as one feature that breaks. Check whether `managedStrippingLevel` is above Minimal for a target and whether CI runs that player build.
- Fix: Test a player build at the raised level from mid-development, and diff type and method lists of the stripped assemblies between levels to see what went. See [performance.md](../../unity-core/performance.md#managed-code-stripping).
- Source: [Unity Performance Tuning Tips 2026: Managed Code Stripping](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/mukai-yuichiro-2.html)

### BD19 IL2CPP LTO Mode set without the Master configuration
- Level: Warning
- Scope: any
- When: android
- Files: ProjectSettings.asset
- Code: any
- Check: MANUAL
- Reason: IL2CPP LTO Mode chooses Thin or Full; it does not turn LTO on. `libil2cpp.so` gets LTO only with the Master C++ configuration, and no setting enables it on Release, so the mode alone leaves generated code without LTO.
- Fix: For LTO on Release, add ThinLTO from the build script; with Master, keep the mode at Thin. Verify the result as BD11 describes. See [performance.md](../../unity-core/performance.md#link-time-optimization-on-android).
- Source: [Unity Performance Tuning Tips 2026: LTO on Android and iOS](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kim-minhyuk-1.html)
