// Editor audit for the EDITOR rules of unity-performance.
// A Roslyn script body for `unity command eval_file`: fully qualified names, no
// using directives, a final return. scan.py --editor-audit fills the /*NAME*/
// markers below and writes the filled copy outside Assets/; run that copy, not
// this template. It reads importer and project settings and changes nothing.

var assetPaths = new string[] { /*ASSETS*/ };
var folders = new string[] { /*FOLDERS*/ };
var platforms = new string[] { /*PLATFORMS*/ };
int maxTextureSize = /*MAX_TEXTURE_SIZE*/2048;
int maxMeshVertices = /*MAX_MESH_VERTICES*/65535;
float longAudioSeconds = /*LONG_AUDIO_SECONDS*/10f;

var findings = new System.Collections.Generic.List<string>();
var notes = new System.Collections.Generic.List<string>();
int textures = 0, models = 0, audioClips = 0;

string Quote(string value)
{
    var sb = new System.Text.StringBuilder("\"");
    foreach (var c in value ?? "")
    {
        if (c == '"' || c == '\\') sb.Append('\\').Append(c);
        else if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
        else sb.Append(c);
    }
    return sb.Append('"').ToString();
}

void Report(string rule, string path, string platform, string detail)
{
    findings.Add("{\"rule\":" + Quote(rule) + ",\"path\":" + Quote(path) + ",\"platform\":" + Quote(platform) + ",\"detail\":" + Quote(detail) + "}");
}

bool Targets(string name) => System.Array.IndexOf(platforms, name) >= 0;

// Importer platform names per scan.py platform; desktop covers the CoreCLR players.
var texturePlatforms = new System.Collections.Generic.List<(string scan, string importer)>();
if (Targets("android")) texturePlatforms.Add(("android", "Android"));
if (Targets("ios")) texturePlatforms.Add(("ios", "iPhone"));
if (Targets("web")) texturePlatforms.Add(("web", "WebGL"));
if (Targets("desktop")) texturePlatforms.Add(("desktop", "Standalone"));
var audioPlatforms = new System.Collections.Generic.List<string>();
if (Targets("android")) audioPlatforms.Add("Android");
if (Targets("ios")) audioPlatforms.Add("iOS");
if (Targets("web")) audioPlatforms.Add("WebGL");
if (Targets("desktop")) audioPlatforms.Add("Standalone");

bool IsCompressed(UnityEditor.TextureImporterFormat format)
{
    var name = format.ToString();
    foreach (var marker in new[] { "ASTC", "ETC", "EAC", "DXT", "BC", "PVRTC", "Crunched" })
        if (name.Contains(marker)) return true;
    return false;
}

void AuditTexture(string path, UnityEditor.TextureImporter importer)
{
    textures++;
    if (importer.isReadable)
        Report("AS03", path, "all", "Read/Write enabled");
    bool uiTexture = importer.textureType == UnityEditor.TextureImporterType.Sprite
        || importer.textureType == UnityEditor.TextureImporterType.GUI;
    if (uiTexture && importer.mipmapEnabled)
        Report("AS04", path, "all", "mipmaps on a " + importer.textureType + " texture");
    importer.GetSourceTextureWidthAndHeight(out int width, out int height);
    int source = System.Math.Max(width, height);
    var defaults = importer.GetDefaultPlatformTextureSettings();
    foreach (var (scanName, importerName) in texturePlatforms)
    {
        var settings = importer.GetPlatformTextureSettings(importerName);
        if (settings == null || !settings.overridden) settings = defaults;
        int imported = System.Math.Min(source, settings.maxTextureSize);
        if (imported > maxTextureSize)
            Report("AS01", path, scanName, "imported at " + imported + " px (max size " + settings.maxTextureSize + ", source " + width + "x" + height + ")");
        // An explicit format wins over the compression setting, which an override keeps from the defaults;
        // the automatic format already reflects that setting.
        bool automatic = settings.format == UnityEditor.TextureImporterFormat.Automatic;
        var format = automatic ? importer.GetAutomaticFormat(importerName) : settings.format;
        if (!IsCompressed(format))
            Report("AS02", path, scanName, "format " + format + (automatic ? " (automatic, compression " + settings.textureCompression + ")" : " (explicit)"));
    }
}

void AuditModel(string path, UnityEditor.ModelImporter importer)
{
    models++;
    if (importer.isReadable)
        Report("AS03", path, "all", "Read/Write enabled");
    // Static meshes also import with a Generic animation type; a skinned renderer marks a real rig.
    var root = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.GameObject>(path);
    bool skinned = root != null && root.GetComponentsInChildren<UnityEngine.SkinnedMeshRenderer>(true).Length > 0;
    bool rigged = skinned && (importer.animationType == UnityEditor.ModelImporterAnimationType.Generic
        || importer.animationType == UnityEditor.ModelImporterAnimationType.Human);
    if (rigged && !importer.optimizeGameObjects)
        Report("AN01", path, "all", importer.animationType + " rig with Optimize Game Objects off");
    if (importer.importAnimation && importer.animationCompression == UnityEditor.ModelImporterAnimationCompression.Off)
        Report("AS11", path, "all", "animation compression Off");
    long vertices = 0;
    foreach (var asset in UnityEditor.AssetDatabase.LoadAllAssetsAtPath(path))
        if (asset is UnityEngine.Mesh mesh) vertices += mesh.vertexCount;
    if (vertices > maxMeshVertices)
        Report("AS05", path, "all", vertices + " vertices");
}

void AuditAudio(string path, UnityEditor.AudioImporter importer)
{
    audioClips++;
    var clip = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.AudioClip>(path);
    if (clip == null || clip.length <= longAudioSeconds) return;
    foreach (var platform in audioPlatforms)
    {
        var settings = importer.ContainsSampleSettingsOverride(platform)
            ? importer.GetOverrideSampleSettings(platform)
            : importer.defaultSampleSettings;
        var seconds = clip.length.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
        if (settings.loadType == UnityEngine.AudioClipLoadType.DecompressOnLoad)
            Report("AS07", path, platform, seconds + " s decompressed on load");
        if (settings.compressionFormat == UnityEngine.AudioCompressionFormat.PCM)
            Report("AS08", path, platform, seconds + " s stored as PCM");
    }
}

var queue = new System.Collections.Generic.List<string>(assetPaths);
if (folders.Length > 0)
    foreach (var guid in UnityEditor.AssetDatabase.FindAssets("t:Texture t:Model t:AudioClip", folders))
        queue.Add(UnityEditor.AssetDatabase.GUIDToAssetPath(guid));
var seen = new System.Collections.Generic.HashSet<string>();
foreach (var path in queue)
{
    if (!seen.Add(path)) continue;
    var importer = UnityEditor.AssetImporter.GetAtPath(path);
    if (importer is UnityEditor.TextureImporter texture) AuditTexture(path, texture);
    else if (importer is UnityEditor.ModelImporter model) AuditModel(path, model);
    else if (importer is UnityEditor.AudioImporter audio) AuditAudio(path, audio);
    else if (importer == null) notes.Add("not imported: " + path);
}

bool il2cppTarget = Targets("android") || Targets("ios") || Targets("web");
if (il2cppTarget && !UnityEditor.PlayerSettings.stripEngineCode)
    Report("BD02", "ProjectSettings/ProjectSettings.asset", "il2cpp", "Strip Engine Code disabled");
if (Targets("android") && UnityEditor.PlayerSettings.GetIl2CppCompilerConfiguration(UnityEditor.Build.NamedBuildTarget.Android) == UnityEditor.Il2CppCompilerConfiguration.Master)
    Report("BD04", "ProjectSettings/ProjectSettings.asset", "android", "C++ Compiler Configuration Master");
var invariant = System.Globalization.CultureInfo.InvariantCulture;
if (UnityEngine.Time.fixedDeltaTime < 1f / 60f - 0.0001f)
    Report("PH03", "ProjectSettings/TimeManager.asset", "all", "Fixed Timestep " + UnityEngine.Time.fixedDeltaTime.ToString("0.0000", invariant) + " s");
object Read(object target, string property) =>
    (target as System.Type ?? target.GetType()).GetProperty(property,
        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static)
    ?.GetValue(target is System.Type ? null : target);
// Read by reflection because the setting is obsolete in Unity 7: once Unity removes
// Physics.autoSyncTransforms, delete this check and rule PH09.
if (Read(typeof(UnityEngine.Physics), "autoSyncTransforms") is bool autoSync && autoSync)
    Report("PH09", "ProjectSettings/DynamicsManager.asset", "all", "Auto Sync Transforms enabled");
foreach (var (scanName, buildTarget) in new[] { ("android", "Android"), ("ios", "iPhone") })
    if (Targets(scanName) && UnityEngine.QualitySettings.GetActiveQualityLevelsForPlatformCount(buildTarget) < 2)
        Report("RP12", "ProjectSettings/QualitySettings.asset", scanName, UnityEngine.QualitySettings.GetActiveQualityLevelsForPlatformCount(buildTarget) + " Quality Level(s) active");

// Each URP asset is checked once, with the targets whose Quality Levels use it.
// Its properties are read by reflection so the script compiles without URP installed.
var pipelineTargets = new System.Collections.Generic.Dictionary<UnityEngine.Rendering.RenderPipelineAsset, System.Collections.Generic.List<string>>();
foreach (var (scanName, buildTarget) in texturePlatforms)
{
    var assets = new System.Collections.Generic.List<UnityEngine.Rendering.RenderPipelineAsset>();
    UnityEngine.QualitySettings.GetAllRenderPipelineAssetsForPlatform(buildTarget, ref assets);
    foreach (var asset in assets)
    {
        if (asset == null) continue;
        if (!pipelineTargets.TryGetValue(asset, out var list)) pipelineTargets[asset] = list = new System.Collections.Generic.List<string>();
        if (!list.Contains(scanName)) list.Add(scanName);
    }
}
foreach (var entry in pipelineTargets)
{
    var asset = entry.Key;
    if (asset.GetType().FullName != "UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset") continue;
    var path = UnityEditor.AssetDatabase.GetAssetPath(asset);
    var used = string.Join("+", entry.Value);
    if (Read(asset, "supportsCameraDepthTexture") is bool depth && depth)
        Report("RP20", path, used, "Depth Texture enabled");
    if (Read(asset, "msaaSampleCount") is int msaa && msaa >= 8)
        Report("GR08", path, used, msaa + "x MSAA");
    if (!entry.Value.Contains("android") && !entry.Value.Contains("ios")) continue;
    var heavy = new System.Collections.Generic.List<string>();
    if (Read(asset, "mainLightShadowmapResolution") is int resolution && resolution >= 4096) heavy.Add("shadow map " + resolution);
    if (Read(asset, "shadowDistance") is float distance && distance > 100f) heavy.Add("shadow distance " + distance.ToString(invariant));
    if (Read(asset, "shadowCascadeCount") is int cascades && cascades >= 4) heavy.Add(cascades + " cascades");
    if (heavy.Count > 0)
        Report("GR05", path, used, string.Join(", ", heavy));
}

var noteJson = new System.Collections.Generic.List<string>();
foreach (var note in notes) noteJson.Add(Quote(note));
return "{\"unity\":" + Quote(UnityEngine.Application.unityVersion)
    + ",\"platforms\":[" + string.Join(",", System.Array.ConvertAll(platforms, Quote)) + "]"
    + ",\"checked\":{\"textures\":" + textures + ",\"models\":" + models + ",\"audio\":" + audioClips + ",\"render_pipeline_assets\":" + pipelineTargets.Count + "}"
    + ",\"findings\":[" + string.Join(",", findings) + "]"
    + ",\"notes\":[" + string.Join(",", noteJson) + "]}";
