// Every word in the toon look of the bake-off opening (?lang=en|zh). Captions: '|' splits a line into timed parts,
// '/' breaks a part into rows (captionAt, as in ../../film/film.js).
export const STR = {
  en: {
    hook: ['A data-center AI…', '…on ONE gaming card?'],
    forum: { site: 'devboard', tab: 'hot', title: ['Ran a data-center', 'AI model on ONE', 'gaming card'], by: 'posted 2 h ago', votes: 'votes', comments: '1,203 comments' },
    bubbles: ['No way!', 'ONE card?!', 'my GPU can do that??'],
    count: 'chefs',
    ticket: { head: 'ORDER', word: ['one', 'word'], need: ['→ ', '8', ' chefs'] },
    cap: {
      b1: 'Last week, someone ran an AI model/that normally lives in a data center…|…on one gaming graphics card.',
      b2: 'Programmers lost their minds.',
      b3: 'How? Picture a restaurant kitchen/with 128 chefs.',
      b4: 'For each word the AI writes,/only 8 of them cook.',
    },
  },
  zh: {
    hook: ['数据中心的 AI 大模型', '塞进一张游戏显卡？'],
    forum: { site: '码农论坛', tab: '热帖', title: ['把数据中心级', 'AI 大模型', '跑进一张游戏显卡'], by: '2 小时前', votes: '赞', comments: '1203 条评论' },
    bubbles: ['真的假的！', '一张卡？！', '我的显卡也行？'],
    count: '位厨师',
    ticket: { head: '点单', word: ['一个字'], need: ['→ ', '8', ' 位厨师'] },
    cap: {
      b1: '上周，有人把一个平时/只在数据中心跑的 AI 大模型，|塞进了一张游戏显卡里。',
      b2: '程序员们都炸了。',
      b3: '怎么做到的？/想象一间后厨，站着 128 位厨师。',
      b4: 'AI 每写一个字，/只需要其中 8 位上手。',
    },
  },
};
