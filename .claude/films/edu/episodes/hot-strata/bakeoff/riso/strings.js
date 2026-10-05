// Every word in the riso bake-off cut (?lang=en|zh). Captions: '|' splits a line in time, '/' breaks a row.
// sync: the VO word each picture beat waits for (vo_<lang>.json).
export const STR = {
  en: {
    hook: ['DATA-CENTER AI', 'ON ONE GAMING CARD?'],
    tagDC: 'DATA CENTER', tagCard: 'GAMING CARD',
    forum: ['Data-center AI runs', 'on ONE gaming card'], bubbles: ['NO WAY!', 'WHAT?!'],
    banner: ['128', 'CHEFS'], ticket: ['ONE', 'WORD'],
    sync: { move: ['b1', 'on'], land: ['b1', 'card'], many: ['b3', 'hundred'], eight: ['b4', 'eight'] },
    cap: {
      b1: 'Last week, someone ran an AI model/that normally lives in a data center…|…on one gaming graphics card.',
      b2: 'Programmers lost their minds.',
      b3: 'How?|Picture a restaurant kitchen/with 128 chefs.',
      b4: 'For each word the AI writes,|only 8 of them cook.',
    },
  },
  zh: {
    hook: ['数据中心的 AI 大模型', '塞进一张游戏显卡？'],
    tagDC: '数据中心', tagCard: '游戏显卡',
    forum: ['数据中心级大模型', '一张游戏显卡跑起来了'], bubbles: ['不可能！', '真的假的？'],
    banner: ['128', '位厨师'], ticket: ['一个字'],
    sync: { move: ['b1', '塞进'], land: ['b1', '显卡'], many: ['b3', '一百二十八'], eight: ['b4', '八'] },
    cap: {
      b1: '上周 有人把一个/平时只在数据中心跑的AI大模型|塞进了一张游戏显卡里',
      b2: '程序员们都炸了',
      b3: '怎么做到的？|想象一间后厨/站着128位厨师',
      b4: 'AI每写一个字|只需要其中8位上手',
    },
  },
};
