// 注入鸽之力组件 i18n key 到 5 语言 locale（一次性迁移脚本）
import fs from 'node:fs';

const L = ['zh', 'en', 'es', 'jp', 'kr'];
const dir = 'src/locales/lang';

// key -> [zh, en, es, jp, kr]
const T = {
    // HealthCheckCard
    'tool.healthCheck.title': ['存档体检自检', 'Archive Health Check', 'Comprobación del archivo', 'アーカイブ自己診断', '아카이브 자체 점검'],
    'tool.healthCheck.strictMode': ['严格模式', 'Strict Mode', 'Modo estricto', '厳格モード', '엄격 모드'],
    'tool.healthCheck.strictOn': ['严格模式已开启：体检有 error 时手动开服会被拦住', 'Strict mode on: manual start is blocked when the check reports errors', 'Modo estricto activado: el inicio manual se bloquea si hay errores', '厳格モードを有効化：エラー時は手動起動がブロックされます', '엄격 모드 켜짐: 오류 시 수동 서버 시작이 차단됩니다'],
    'tool.healthCheck.strictOff': ['严格模式已关闭', 'Strict mode off', 'Modo estricto desactivado', '厳格モードを無効化', '엄격 모드 꺼짐'],
    'tool.healthCheck.run': ['开始体检', 'Run Check', 'Ejecutar comprobación', '診断を実行', '점검 실행'],
    'tool.healthCheck.desc': ['开服前检查端口冲突/主分片/互通/令牌/模组等 10 项', 'Pre-start checks: port conflicts, master shard, connectivity, token, mods (10 items)', 'Comprobaciones previas: puertos, shard maestro, conectividad, token, mods (10)', '起動前チェック：ポート競合・マスター分片・疎通・トークン・MOD など10項目', '시작 전 점검: 포트 충돌·마스터 분할·연동·토큰·모드 등 10개 항목'],
    'tool.healthCheck.colWorld': ['世界', 'World', 'Mundo', '世界', '월드'],
    'tool.healthCheck.colItem': ['检查项', 'Check Item', 'Ítem', 'チェック項目', '점검 항목'],
    'tool.healthCheck.colStatus': ['状态', 'Status', 'Estado', '状態', '상태'],
    'tool.healthCheck.colMessage': ['说明', 'Message', 'Mensaje', '説明', '설명'],
    'tool.healthCheck.colFixHint': ['修复建议', 'Fix Hint', 'Sugerencia', '修正提案', '수정 제안'],

    // DirectConnectCard
    'tool.directConnect.title': ['直连代码生成', 'Direct Connect Code', 'Código de conexión directa', '直結コード生成', '직접 연결 코드 생성'],
    'tool.directConnect.saved': ['直连配置已保存', 'Direct connect config saved', 'Configuración guardada', '直結設定を保存しました', '직접 연결 설정 저장됨'],
    'tool.directConnect.copied': ['已复制', 'Copied', 'Copiado', 'コピーしました', '복사됨'],
    'tool.directConnect.generate': ['生成', 'Generate', 'Generar', '生成', '생성'],
    'tool.directConnect.world': ['世界', 'World', 'Mundo', '世界', '월드'],
    'tool.directConnect.modeAuto': ['自动探测', 'Auto Detect', 'Auto', '自動検出', '자동 탐지'],
    'tool.directConnect.modeManual': ['手动', 'Manual', 'Manual', '手動', '수동'],
    'tool.directConnect.modeBind': ['绑定地址', 'Bind Address', 'Dirección enlazada', 'バインドアドレス', '바인드 주소'],
    'tool.directConnect.externalIp': ['外网IP/域名', 'Public IP/Domain', 'IP/Dominio público', '外部IP/ドメイン', '공인 IP/도메인'],
    'tool.directConnect.externalIpPlaceholder': ['manual 模式必填；frp 填域名', 'Required for manual; domain for frp', 'Obligatorio en manual; dominio para frp', 'manual 時は必須；frp はドメイン', 'manual 모드 필수; frp는 도메인'],
    'tool.directConnect.externalPort': ['外部端口', 'External Port', 'Puerto externo', '外部ポート', '외부 포트'],
    'tool.directConnect.externalPortPlaceholder': ['NAT/FRP 映射端口', 'NAT/FRP mapped port', 'Puerto mapeado NAT/FRP', 'NAT/FRP マッピングポート', 'NAT/FRP 매핑 포트'],
    'tool.directConnect.saveConfig': ['保存配置', 'Save Config', 'Guardar', '設定を保存', '설정 저장'],
    'tool.directConnect.consoleDirect': ['控制台直连：', 'Console Direct: ', 'Consola directa: ', 'コンソール直結：', '콘솔 직접 연결: '],
    'tool.directConnect.steamJoin': ['Steam 一键加入：', 'Steam Quick Join: ', 'Steam unirse: ', 'Steam 一键加入：', 'Steam 빠른 참가: '],
    'tool.directConnect.copy': ['复制', 'Copy', 'Copiar', 'コピー', '복사'],
    'tool.directConnect.portInfo': ['IP: {ip}　内部端口: {internal}　外部端口: {external}', 'IP: {ip}  Internal: {internal}  External: {external}', 'IP: {ip}  Interno: {internal}  Externo: {external}', 'IP: {ip}　内部ポート: {internal}　外部ポート: {external}', 'IP: {ip}  내부 포트: {internal}  외부 포트: {external}'],

    // LuaJitSetting
    'setting.luajitCard.title': ['LuaJIT 模组开关', 'LuaJIT Mod Switch', 'Interruptor de mod LuaJIT', 'LuaJIT MODスイッチ', 'LuaJIT 모드 스위치'],
    'setting.luajitCard.enabled': ['已启用 LuaJIT 模组（各世界 modoverrides 已更新）', 'LuaJIT mod enabled (modoverrides updated for all worlds)', 'Mod LuaJIT activado (modoverrides actualizados)', 'LuaJIT MODを有効化（各世界の modoverrides を更新）', 'LuaJIT 모드 활성화 (월드 modoverrides 갱신됨)'],
    'setting.luajitCard.disabled': ['已禁用 LuaJIT 模组', 'LuaJIT mod disabled', 'Mod LuaJIT desactivado', 'LuaJIT MODを無効化', 'LuaJIT 모드 비활성화'],
    'setting.luajitCard.desc': ['启用后强制写入 fesily/dontstarveluajit2（workshop-3444078585）到所有世界。Linux 已用 luajit 二进制时无需此项。', 'When enabled, forces fesily/dontstarveluajit2 (workshop-3444078585) into all worlds. Not needed on Linux when using the luajit binary.', 'Al habilitar, fuerza fesily/dontstarveluajit2 (workshop-3444078585) en todos los mundos. No necesario en Linux con el binario luajit.', '有効化すると fesily/dontstarveluajit2（workshop-3444078585）を全世界に強制書き込みします。Linux で luajit バイナリ使用時は不要です。', '활성화 시 fesily/dontstarveluajit2(workshop-3444078585)를 모든 월드에 강제로 기록합니다. Linux에서 luajit 바이너리 사용 시 불필요합니다.'],

    // IaPresetCard
    'level.iaPreset.title': ['岛屿冒险(Island Adventures)预设', 'Island Adventures Preset', 'Preset de Island Adventures', '島の冒険(Island Adventures)プリセット', '아일랜드 어드벤처 프리셋'],
    'level.iaPreset.overlay': ['叠加到现有存档（推荐）', 'Overlay on existing save (recommended)', 'Superponer al guardado (recomendado)', '既存のセーブに重ねる（推奨）', '기존 세이브에 겹치기 (권장)'],
    'level.iaPreset.standalone': ['独立 IA 存档（替换现有世界，慎用）', 'Standalone IA save (replaces worlds, use caution)', 'Guardado IA independiente (reemplaza mundos)', '独立 IA セーブ（既存世界を置換・注意）', '독립 IA 세이브 (월드 교체, 주의)'],
    'level.iaPreset.create': ['一键创建 Shipwrecked + Volcano', 'Create Shipwrecked + Volcano', 'Crear Shipwrecked + Volcano', 'Shipwrecked + Volcano を作成', 'Shipwrecked + Volcano 생성'],
    'level.iaPreset.workshopHint': ['需要创意工坊 mod：Island Adventures (workshop-1467214795)', 'Requires workshop mod: Island Adventures (workshop-1467214795)', 'Requiere mod de workshop: Island Adventures (workshop-1467214795)', 'ワークショップ MOD 必須：Island Adventures (workshop-1467214795)', '워크샵 모드 필요: Island Adventures (workshop-1467214795)'],
    'level.iaPreset.createdOverlay': ['已追加 Shipwrecked + Volcano 世界（不改动现有 Master/Caves）', 'Added Shipwrecked + Volcano worlds (Master/Caves unchanged)', 'Mundos Shipwrecked + Volcano añadidos (Master/Caves sin cambios)', 'Shipwrecked + Volcano 世界を追加（既存 Master/Caves は不変）', 'Shipwrecked + Volcano 월드 추가됨 (Master/Caves 변경 없음)'],
    'level.iaPreset.createdStandalone': ['已创建独立 IA 存档（Shipwrecked 为主分片）', 'Created standalone IA save (Shipwrecked as master)', 'Guardado IA independiente creado (Shipwrecked como maestro)', '独立 IA セーブを作成（Shipwrecked をマスターに）', '독립 IA 세이브 생성됨 (Shipwrecked를 마스터로)'],
    'level.iaPreset.createFailed': ['创建失败：', 'Create failed: ', 'Error al crear: ', '作成失敗：', '생성 실패: '],
};

const missing = [];
for (const lang of L) {
    const p = `${dir}/${lang}.json`;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    let add = 0;
    for (const [key, arr] of Object.entries(T)) {
        const idx = L.indexOf(lang);
        if (arr[idx] == null) { missing.push(`${key}/${lang}`); continue; }
        if (!(key in j)) { j[key] = arr[idx]; add++; }
    }
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8');
    console.log(`${lang}: +${add} keys, total ${Object.keys(j).length}`);
}
if (missing.length) { console.error('MISSING:', missing); process.exit(1); }

// 校验 5 语言 key 集合一致
const sets = L.map(lang => new Set(Object.keys(JSON.parse(fs.readFileSync(`${dir}/${lang}.json`, 'utf8')))));
const ref = sets[0];
for (let i = 1; i < L.length; i++) {
    for (const k of ref) if (!sets[i].has(k)) console.error(`key ${k} missing in ${L[i]}`);
    for (const k of sets[i]) if (!ref.has(k)) console.error(`key ${k} extra in ${L[i]}`);
}
console.log('i18n key parity check done');
