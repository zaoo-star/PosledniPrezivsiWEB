#!/usr/bin/env python3
"""Generátor bezpečnějších pravidel Firebase RTDB pro Poslední Přeživší (v7.54).

Vychází z current.json (pravidla z konzole), zachovává všechny .indexOn a:
  * kritické větve (serverReset, nastavení, role, logy, bany…) smí měnit jen admin/staff podle UID,
  * kolekce nejde smazat/přepsat najednou – hráči zapisují jednotlivé záznamy,
  * e-maily (registeredNicks), admin logy a seznam soukromých schránek nejdou stáhnout hromadně.
Admin/staff se určuje uzly /adminUIDs/<uid>: true a /staffUIDs/<uid>: true (mění se jen v konzoli).
"""
import json, copy, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'current.json'
cur = json.load(open(SRC))['rules']

ADM = "auth != null && root.child('adminUIDs').child(auth.uid).val() === true"
STAFF = "auth != null && (root.child('adminUIDs').child(auth.uid).val() === true || root.child('staffUIDs').child(auth.uid).val() === true)"
EXPIRED_DELETE = "!newData.exists() && data.exists() && data.child('until').isNumber() && data.child('until').val() > 0 && data.child('until').val() < now"

def is_collection(node):
    return isinstance(node, dict) and '.indexOn' in node

def wildcard_key(node):
    for k in node:
        if k.startswith('$'):
            return k
    return None

def protect_collection(node, depth=0):
    """Kolekce: celou ji smí přepsat/smazat jen admin, jednotlivé záznamy kdokoli (jako dosud)."""
    node = copy.deepcopy(node)
    node['.write'] = ADM
    wk = wildcard_key(node) or '$id'
    w = node.get(wk, {})
    w = {k: v for k, v in w.items()}
    w['.write'] = True
    node[wk] = w
    for k in list(node.keys()):
        if k.startswith('.') or k.startswith('$'):
            continue
        ch = node[k]
        if is_collection(ch) and depth < 3:
            node[k] = protect_collection(ch, depth + 1)
        else:
            ch = dict(ch) if isinstance(ch, dict) else {}
            ch['.write'] = True
            node[k] = ch
    return node

new = {}
for top, node in cur.items():
    node = copy.deepcopy(node)
    new[top] = node

# --- 1) Admin / staff uzly -------------------------------------------------
new['adminUIDs'] = {'.read': False, '.write': False}
new['staffUIDs'] = {'.read': False, '.write': ADM}  # admin přidává moderátory z herního panelu
new['serverReset'] = {'.read': True, '.write': ADM}           # zápis = smazání savů všem hráčům
new['settings'] = {'.read': True, '.write': ADM}
new['adminData'] = {'.read': True, '.write': ADM, 'staffMembers': cur['adminData'].get('staffMembers', {})}
adm = copy.deepcopy(cur['admin']); adm['.read'] = STAFF; adm['.write'] = STAFF
new['admin'] = adm
for k in ('hallOfFame', 'donors'):
    n = copy.deepcopy(cur[k]); n['.write'] = ADM; new[k] = n
lb = copy.deepcopy(cur['leaderboardBans']); lb['.write'] = STAFF; new['leaderboardBans'] = lb

# --- 2) Bany a mute: staff; hráč smí smazat jen vypršelý záznam ---------------
for k in ('bannedPlayers', 'bannedUIDs', 'mutedPlayers', 'mutes', 'bans'):
    n = copy.deepcopy(cur[k]); n['.write'] = STAFF
    n['$k'] = {'.write': EXPIRED_DELETE}
    new[k] = n
for k in ('clanBan', 'tombolaBan', 'treasureBan', 'worldBoss'):
    n = copy.deepcopy(cur[k]); n['.write'] = STAFF
    b = n.get('banned', {}); b['$k'] = {'.write': EXPIRED_DELETE}; n['banned'] = b
    new[k] = n
vip = copy.deepcopy(cur['vipColors']); vip['.write'] = ADM
vip['$k'] = {'.write': '!newData.exists()'}                     # hráč si smaže svou při nové postavě
new['vipColors'] = vip

# --- 3) Přezdívky: e-maily nejdou stáhnout hromadně, nick nejde ukrást ---------
new['registeredNicks'] = {
    '.read': ADM,
    '.write': ADM,
    '$nick': {
        '.read': True,
        '.write': "auth != null && (!data.exists() || data.child('odid').val() === auth.uid || data.child('uid').val() === auth.uid || (" + ADM + "))",
        '.validate': "!newData.exists() || newData.child('odid').val() === auth.uid || newData.child('uid').val() === auth.uid || (" + ADM + ")",
    },
}

# --- 4) Chat: zprávy po jedné, soukromé schránky nejdou vypsat všechny --------
chat = cur['chat']
new['chat'] = {
    '.write': ADM,
    'messages': {'.read': True, '.write': ADM, '.indexOn': chat['messages']['.indexOn'], '$m': {'.write': True}},
    'reactions': {'.read': True, '.write': ADM, '$m': {'.write': True}},
    'global': {'.read': True, '.write': ADM, '$m': {'.write': True}},
    'staff': {'.read': 'auth != null', '.write': ADM,
              'messages': {'.write': ADM, '.indexOn': chat['staff']['messages']['.indexOn'], '$m': {'.write': 'auth != null'}}},
    'private': {'.write': ADM, '$playerName': {'.read': True, '.write': True, '.indexOn': ['timestamp']}},
}

# --- 5) Statistiky webu: počítadlo návštěv jen +1 ------------------------------
new['stats'] = {
    '.read': True,
    '.write': ADM,
    'visits': {'.write': True, '.validate': 'newData.isNumber() && (!data.exists() || (newData.val() >= data.val() && newData.val() <= data.val() + 1))'},
    '$other': {'.write': True},
}

# --- 6) Žebříček: záznam přihlášeného hráče (user_<uid>) smí měnit jen on -----
lbd = protect_collection(cur['leaderboard'])
wk = wildcard_key(lbd)
lbd[wk]['.write'] = "!$%s.beginsWith('user_') || $%s === 'user_' + auth.uid || (%s)" % (wk[1:], wk[1:], ADM)
new['leaderboard'] = lbd

# --- 7) Ostatní kolekce: celé jen admin, záznamy kdokoli -----------------------
KEEP_OPEN = {  # uzly, které hra zapisuje jako celek (stav světa) – zůstávají otevřené
    'globalWeather', 'invasionEvent', 'treasure', 'worldBossRaid', 'shared', 'poker', 'publicMoney',
    'mayorPriority', 'mayorTaxLocks', 'factionSeason', 'warZone', 'politics', 'systemLocks',
    'pokerTables', 'pokerHands', 'pokerPayouts', 'pokerStats', 'scheduledRaids', 'clanRaidLog',
    'pvpStats', 'pvpDuelCooldowns', 'territoryAudit', 'users', 'cloudSaves', 'reviews', 'playerAvatars',
    'tradeHistory', 'clans', 'mayorTaxRecords', 'mayorTaxBans', 'mayorInvestments',
}
DONE = {'adminUIDs', 'staffUIDs', 'serverReset', 'settings', 'adminData', 'admin', 'hallOfFame', 'donors',
        'leaderboardBans', 'bannedPlayers', 'bannedUIDs', 'mutedPlayers', 'mutes', 'bans', 'clanBan',
        'tombolaBan', 'treasureBan', 'worldBoss', 'vipColors', 'registeredNicks', 'chat', 'stats', 'leaderboard'}
for top, node in cur.items():
    if top in DONE or top in KEEP_OPEN:
        continue
    if node.get('.write') is True and (is_collection(node) or any(not k.startswith('.') for k in node)):
        new[top] = protect_collection(node)

# --- 8) Hromadné čtení osobních dat ------------------------------------------
n = new['notifications']; n.pop('.read', None); n['$playerName']['.read'] = True
for k in ('privateMessages', 'reports'):
    new[k]['.read'] = STAFF

json.dump({'rules': new}, open('new.json', 'w'), ensure_ascii=False, indent=2)
changed = sorted(k for k in new if json.dumps(new[k], sort_keys=True) != json.dumps(cur.get(k), sort_keys=True))
print('uzlů:', len(new), '| změněno:', len(changed))
print(', '.join(changed))
