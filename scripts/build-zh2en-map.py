# 生成 zh→en 映射:IA Core 官方 ia_sc.po + DST 本体 chinese_s.po + 本体 CUSTOMIZATIONSCREEN
import re, json, sys, zipfile

sys.stdout.reconfigure(encoding='utf-8')

zh2en = {}

# 1) IA Core 官方简中 po(msgctxt 格式)
ia_po = open('E:/SteamLibrary/steamapps/workshop/content/322330/3435352667/languages/ia_sc.po',
             encoding='utf-8', errors='replace').read()
for ctx, en, zh in re.findall(r'msgctxt "([^"]*)"\r?\nmsgid "([^"]*)"\r?\nmsgstr "([^"]*)"', ia_po):
    if zh and en:
        zh2en.setdefault(zh, en)

# 2) DST 本体简中 po(\r\n 格式)
p = 'E:/SteamLibrary/steamapps/common/Don' + chr(39) + 't Starve Together/data/databundles/scripts.zip'
z = zipfile.ZipFile(p)
po = z.read('scripts/languages/chinese_s.po').decode('utf-8', errors='replace')
for en, zh in re.findall(r'msgid "([^"]*)"\r\nmsgstr "([^"]*)"', po):
    if zh and en:
        zh2en.setdefault(zh, en)

# 3) 本体 CUSTOMIZATIONSCREEN KEY→EN(直接从 scripts.zip 提取)
data = z.read('scripts/strings.lua').decode('utf-8', errors='replace')
start = data.find('CUSTOMIZATIONSCREEN =')
seg = data[start:start + 120000]
key2en = dict(re.findall(r'^\s{8,12}([A-Z0-9_]+)\s*=\s*"([^"]+)"', seg, re.M))

json.dump({'zh2en': zh2en, 'key2en': key2en},
          open('.tmp-zh2en.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(f'zh2en={len(zh2en)} key2en={len(key2en)} -> .tmp-zh2en.json')
