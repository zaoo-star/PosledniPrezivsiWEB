const t = require('targaryen');
const rules = require('./database.rules.json');
const old = require('./database.rules.OLD-2026-11-18.json');
const now = Date.now();
const data = {
  adminUIDs: { ADMIN: true }, staffUIDs: { STAFF: true },
  serverReset: { timestamp: 1 }, settings: { aiConfig: { x: 1 } },
  adminData: { staffMembers: { Zaoo: 'admin' } }, admin: { auditLog: { a: { x: 1 } } },
  registeredNicks: { pepa: { odid: 'UID2', nick: 'Pepa', email: 'p@x.cz' }, mujnick: { odid: 'UID1', nick: 'Mujnick', email: 'm@x.cz' }, zmeneny: { uid: 'UID1', nick: 'Zmeneny' } },
  leaderboard: { user_UID1: { name: 'A', score: 1 }, user_UID2: { name: 'B', score: 2 }, Guest: { name: 'Guest', score: 1 } },
  chat: { messages: { m1: { author: 'A', text: 'ahoj', timestamp: 1 } }, private: { Pepa: { p1: { text: 'tajne' } } }, staff: { messages: { s1: { text: 'x' } } } },
  bannedPlayers: { Old: { until: now - 1000 }, Bad: { until: now + 99999999 }, Perma: { until: 0 } },
  mutedPlayers: { Muted: { until: now + 99999999 }, OldMute: { until: now - 1 } },
  stats: { visits: 100 }, vipColors: { Name: 'red' }, hallOfFame: { h1: { name: 'X' } },
  notifications: { Pepa: { n1: { text: 'x' } } }, privateMessages: { pm1: { from: 'A', to: 'B' } },
  marketplace: { offers: { o1: { seller: 'A', status: 'active' } } }, friends: { Pepa: { Old: { since: 1 } } },
  gameIdeas: { i1: { votes: { Old: true } } }, worldBossRaid: { currentHp: 100 }, reports: { r1: { x: 1 } },
};
const AUTH = { anon: null, u1: { uid: 'UID1', provider: 'password' }, u2: { uid: 'UID2' }, admin: { uid: 'ADMIN' }, staff: { uid: 'STAFF' } };
const C = [ // [kdo, operace, cesta, hodnota, očekávání, popis]
  // útočník bez účtu
  ['anon','set','serverReset',{timestamp:now},false,'smazat savy všem (serverReset)'],
  ['anon','set','adminData/staffMembers/Hacker','admin',false,'dát si roli admina'],
  ['anon','set','leaderboard',null,false,'smazat celý žebříček'],
  ['anon','set','chat/messages',null,false,'smazat celý chat'],
  ['anon','set','chat',null,false,'smazat chat i schránky'],
  ['anon','set','settings/aiConfig',{claudeProxy:'https://evil'},false,'přesměrovat AI proxy'],
  ['anon','set','bannedPlayers/Bad',null,false,'odbanovat se (aktivní ban)'],
  ['anon','set','bannedPlayers/Perma',null,false,'odbanovat se (trvalý ban)'],
  ['anon','set','bannedPlayers/Nekdo',{until:0},false,'zabanovat někoho'],
  ['anon','set','hallOfFame/x',{name:'Hacker'},false,'zapsat se do síně slávy'],
  ['anon','set','vipColors/Hacker','gold',false,'dát si VIP barvu'],
  ['anon','set','stats/visits',999999999,false,'přepsat počítadlo návštěv'],
  ['anon','set','leaderboard/user_UID1',{score:0},false,'přepsat žebříček registrovaného hráče'],
  ['anon','set','registeredNicks/pepa',{odid:'HACK'},false,'ukrást chráněnou přezdívku'],
  ['anon','read','registeredNicks',null,false,'stáhnout e-maily všech hráčů'],
  ['anon','read','admin',null,false,'číst admin logy'],
  ['anon','read','chat/private',null,false,'stáhnout všechny soukromé schránky'],
  ['anon','read','privateMessages',null,false,'číst soukromé zprávy'],
  ['anon','read','notifications',null,false,'stáhnout oznámení všech'],
  ['anon','read','reports',null,false,'číst nahlášení hráčů'],
  ['anon','set','marketplace',null,false,'smazat celé tržiště'],
  ['anon','set','graveyard',null,false,'smazat celý hřbitov'],
  // host – běžné hraní
  ['anon','push','chat/messages',{author:'Guest',text:'ahoj',timestamp:now},true,'host píše do chatu'],
  ['anon','set','chat/messages/m1',null,true,'smazání jedné zprávy (úklid starých)'],
  ['anon','set','chat/reactions/m1/Guest','👍',true,'reakce na zprávu'],
  ['anon','set','online/Guest',{name:'Guest',lastSeen:now},true,'online stav'],
  ['anon','set','presence/Guest',{online:true,lastSeen:now},true,'presence'],
  ['anon','set','leaderboard/Guest',{name:'Guest',score:5},true,'host v žebříčku'],
  ['anon','push','graveyard',{name:'Guest',cause:'x'},true,'zápis na hřbitov'],
  ['anon','push','marketplace/offers',{seller:'Guest',status:'active'},true,'nabídka na tržiště'],
  ['anon','set','marketplace/offers/o1/status','sold',true,'koupě nabídky'],
  ['anon','set','globalWeather',{type:'rain'},true,'synchronizace počasí'],
  ['anon','set','worldBossRaid/currentHp',90,true,'útok na světového bosse'],
  ['anon','set','worldBossRaid',{currentHp:500},true,'vyvolání bosse'],
  ['anon','set','invasionEvent',{active:true},true,'invaze'],
  ['anon','set','treasure',{locationId:'x'},true,'poklad'],
  ['anon','push','bugReports',{text:'bug'},true,'nahlásit chybu'],
  ['anon','push','reports',{reporter:'Guest'},true,'nahlásit hráče'],
  ['anon','push','notifications/Pepa',{text:'x'},true,'poslat oznámení'],
  ['anon','read','notifications/Pepa',null,true,'číst svá oznámení'],
  ['anon','push','chat/private/Pepa',{text:'ahoj'},true,'poslat soukromou zprávu'],
  ['anon','read','chat/private/Pepa',null,true,'číst svou schránku'],
  ['anon','read','chat/messages',null,true,'číst chat'],
  ['anon','read','registeredNicks/pepa',null,true,'ověřit, zda je nick volný'],
  ['anon','set','bannedPlayers/Old',null,true,'úklid vypršelého banu'],
  ['anon','set','mutedPlayers/OldMute',null,true,'úklid vypršelého mute'],
  ['anon','set','mutedPlayers/Muted',null,false,'smazat si aktivní mute novou postavou'],
  ['anon','set','vipColors/Name',null,true,'smazat svou VIP barvu (nová postava)'],
  ['anon','push','forum/topics',{title:'x'},true,'téma na fóru'],
  ['anon','push','forum/posts',{content:'x'},true,'příspěvek na fóru'],
  ['anon','update','friends',{'Pepa/Old':null},true,'úklid přátel (update kolekce)'],
  ['anon','update','gameIdeas',{'i1/votes/Old':null},true,'úklid hlasů (update kolekce)'],
  ['anon','push','gameIdeas',{title:'x'},true,'nápad na hru'],
  ['anon','push','publicTradeHistory',{x:1},true,'historie obchodu'],
  ['anon','set','players/Guest/pendingMoney',null,true,'převzetí odměny'],
  ['anon','set','stats/visits',101,true,'počítadlo návštěv +1'],
  ['anon','read','leaderboard',null,true,'číst žebříček'],
  ['anon','read','serverReset',null,true,'hra čte serverReset'],
  ['anon','read','adminData',null,true,'hra čte role staffu'],
  // přihlášený hráč
  ['u1','set','registeredNicks/novy',{odid:'UID1',nick:'Novy',registeredAt:now},true,'registrace přezdívky'],
  ['u1','set','registeredNicks/mujnick',null,true,'změna přezdívky (smazání staré)'],
  ['u1','set','registeredNicks/mujnick/email',null,true,'odstranění e-mailu ze svého záznamu'],
  ['u1','set','registeredNicks/novy2',{uid:'UID1',odid:'UID1',nick:'Novy2',previousNick:'Mujnick'},true,'změna přezdívky (nový záznam s uid)'],
  ['u1','set','registeredNicks/zmeneny',null,true,'smazání záznamu se starým polem uid'],
  ['u2','set','registeredNicks/zmeneny',null,false,'cizí smaže můj nick (pole uid)'],
  ['admin','set','staffUIDs/UID2',true,true,'admin: přidat moderátora (UID)'],
  ['u1','set','staffUIDs/UID1',true,false,'hráč si dá práva moderátora'],
  ['u1','set','registeredNicks/pepa',{odid:'UID1'},false,'převzít cizí přezdívku'],
  ['u1','set','registeredNicks/x2',{odid:'UID2'},false,'registrovat nick na cizí UID'],
  ['u1','set','leaderboard/user_UID1',{score:9},true,'vlastní záznam v žebříčku'],
  ['u1','set','leaderboard/user_UID2',{score:0},false,'cizí záznam v žebříčku'],
  ['u1','set','cloudSaves/UID1',{x:1},true,'vlastní cloud save'],
  ['u1','set','cloudSaves/UID2',{x:1},false,'cizí cloud save'],
  ['u1','set','playerAvatars/A','data:image/png;base64,xx',true,'avatar'],
  ['u1','read','chat/staff/messages',null,true,'staff chat (přihlášený)'],
  ['u1','set','serverReset',{timestamp:now},false,'přihlášený hráč resetuje server'],
  // admin a staff
  ['admin','set','serverReset',{timestamp:now},true,'admin: reset serveru'],
  ['admin','set','adminData/staffMembers/Mod','moderator',true,'admin: přidat staff'],
  ['admin','set','leaderboard',null,true,'admin: vymazat žebříček'],
  ['admin','set','chat',null,true,'admin: reset chatu'],
  ['admin','set','settings/aiConfig',{x:2},true,'admin: nastavení'],
  ['admin','push','hallOfFame',{name:'X'},true,'admin: síň slávy'],
  ['admin','set','vipColors/Name','gold',true,'admin: VIP barva'],
  ['admin','read','admin',null,true,'admin: číst logy'],
  ['admin','read','registeredNicks',null,true,'admin: záloha přezdívek při resetu'],
  ['admin','set','bannedPlayers/X',{until:0},true,'admin: ban'],
  ['admin','read','reports',null,true,'admin: nahlášení'],
  ['staff','set','bannedPlayers/X',{until:0},true,'staff: ban'],
  ['staff','set','mutedPlayers/X',{until:0},true,'staff: mute'],
  ['staff','push','admin/auditLog',{x:1},true,'staff: audit log'],
  ['staff','set','settings/aiConfig',{x:3},false,'staff nesmí nastavení'],
  ['staff','set','serverReset',{timestamp:now},false,'staff nesmí reset'],
];
function run(r) {
  const db0 = t.database(r, data).with({ debug: false });
  let fails = 0, out = [];
  for (const [who, op, path, val, exp, desc] of C) {
    const db = db0.as(AUTH[who]);
    let res;
    try {
      if (op === 'read') res = db.read(path);
      else if (op === 'set') res = db.write(path, val);
      else if (op === 'push') res = db.write(path + '/-Npush' + Math.random().toString(36).slice(2,8), val);
      else if (op === 'update') res = db.update(path, val);
    } catch (e) { res = { allowed: 'ERR ' + e.message.slice(0, 80) }; }
    const ok = res.allowed === exp;
    if (!ok) fails++;
    out.push(`${ok ? '✅' : '❌'} [${who}] ${desc}: ${res.allowed === true ? 'povoleno' : res.allowed === false ? 'zakázáno' : res.allowed}`);
  }
  return { fails, out };
}
const mode = process.argv[2] || 'new';
const R = run(mode === 'old' ? old : rules);
console.log(R.out.join('\n'));
console.log(`\n${mode}: ${C.length - R.fails}/${C.length} odpovídá očekávání`);
