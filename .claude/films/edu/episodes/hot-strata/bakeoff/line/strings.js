// Every word in the "line" bake-off cut (?lang=en|zh). Captions: '|' splits a VO line into timed parts, '/' breaks rows.
export const STR = {
  en: {
    hook: ['A data-center AI', 'on ONE gaming card?'],
    model: 'AI model', dc: 'data center', card: 'ONE gaming card',
    wow: ['WHAT?!', 'no way', 'how??'],
    q: '?', chefs: '128 chefs', ticket: ['one', 'word'], eight: 'only 8 cook',
    cap: {
      b1: 'Last week, someone ran an AI model/that normally lives in a data center…|…on one gaming graphics card.',
      b2: 'Programmers lost their minds.',
      b3: 'How? Picture a restaurant kitchen…|…with 128 chefs.',
      b4: 'For each word the AI writes,|only 8 of them cook.',
    },
  },
  zh: {
    hook: ['数据中心的 AI 大模型', '塞进一张游戏显卡？'],
    model: 'AI 大模型', dc: '数据中心', card: '一张游戏显卡',
    wow: ['啊？！', '不可能', '真的假的'],
    q: '？', chefs: '128 位厨师', ticket: ['一个字'], eight: '只要 8 位上手',
    cap: {
      b1: '上周，有人把一个平时/只在数据中心跑的 AI 大模型，|塞进了一张游戏显卡里',
      b2: '程序员们都炸了',
      b3: '怎么做到的？|想象一间后厨/站着 128 位厨师',
      b4: 'AI 每写一个字，|只需要其中 8 位上手',
    },
  },
};
