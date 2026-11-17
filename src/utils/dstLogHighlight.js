import * as monaco from 'monaco-editor'

// DST 服务器日志高亮:Monarch 分词 + 双主题。
// 行格式 [HH:MM:SS]: 消息;分类按消息关键词着色(错误/警告/关键节点/命令/玩家KU等)。
let registered = false

export function registerDstLogHighlight() {
    if (registered) return
    registered = true

    monaco.languages.register({id: 'dstlog'})
    monaco.languages.setMonarchTokensProvider('dstlog', {
        tokenizer: {
            root: [
                // [00:01:01] 时间戳:暗灰
                [/\[\d{2}:\d{2}:\d{2}\]/, 'timestamp'],
                // 远程命令回显:紫
                [/RemoteCommandInput/, 'command'],
                // 资源缺失类噪声降级为黄(优先于 error 的 Failed 匹配,避免误红)
                [/AnimationFile::LoadFile|Failed to open anim|Could not find|Could not preload|Could not load mod_config_data|\[Mods\] refused path|Warning:/, 'warning'],
                // 错误:红
                [/\bERROR\b|\bError\b|\berror\b|CURL ERROR|Traceback|attempt to call|nil value|panic|failed|Failed|失败|崩溃/, 'error'],
                // 警告:黄
                [/\[WARNING\]|\bWARNING\b|\bWARN\b/, 'warning'],
                // Mod 加载:蓝(注册/导入/配置应用全族)
                [/Registering \w* ?Mod\b|Registering \w+ mod namespace|modimport:|mod require file:|Overriding mod |loading modinfo\.lua|\[Workshop\]|Mod: workshop-|ModIndex:GetModsToLoad|applying configuration_options|modoverrides\.lua enabling/, 'modload'],
                // 关键节点:绿(分片/世界同步 + 世界生命周期)
                [/\[Shard\]|Sim (?:un)?paused|Server registered|Starting Up|World generated|Loading world|World (?:is )?ready|Connecting to master|Registering (?:slave|master)|Waiting for (?:slave|master|shard)|Connected to|Resuming|Saving complete|Mounting file system|\.\.\.Done|PersistRootStorage is now/, 'milestone'],
                // 玩家事件:粉(接入/离开/聊天/生死)
                [/TokenPurpose|Joined|left the|Say:|killed|died|respawn/, 'player'],
                // 玩家 KU id:青
                [/\bKU_[A-Za-z0-9_]+\b/, 'kuid'],
                // 字符串与数字
                [/"[^"]*"/, 'string'],
                [/\b\d+(?:\.\d+)?[a-zA-Z%]*\b/, 'number'],
            ],
        },
    })

    const rules = [
        {token: 'timestamp', foreground: '7A7A7A'},
        {token: 'error', foreground: 'FF4D4F', fontStyle: 'bold'},
        {token: 'warning', foreground: 'E6A23C'},
        {token: 'modload', foreground: '1E90FF'},
        {token: 'milestone', foreground: '52C41A', fontStyle: 'bold'},
        {token: 'command', foreground: 'B37FEB'},
        {token: 'player', foreground: 'F759AB', fontStyle: 'bold'},
        {token: 'kuid', foreground: '13C2C2'},
        {token: 'string', foreground: '69C0FF'},
        {token: 'number', foreground: '9254DE'},
    ]
    monaco.editor.defineTheme('dstlog-dark', {base: 'vs-dark', inherit: true, rules, colors: {}})
    monaco.editor.defineTheme('dstlog-light', {base: 'vs', inherit: true, rules, colors: {}})
}

// 模块加载即注册:早于 MonacoEditor 的 effect 创建编辑器,语言/主题必然就绪
registerDstLogHighlight()

export default registerDstLogHighlight
