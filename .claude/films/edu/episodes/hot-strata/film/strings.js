// Every word in the Strata hot-topic film (?lang=en|zh). Numbers: ../NOTES.md (our released Qwen3-235B traces).
export const STR = {
  en: {
    hook: ['125B MoE', 'on ONE RTX 4090?'], hookTag: '“Strata”, on the Hacker News front page · Oct 2026',
    board: 'ONE LAYER · 128 EXPERTS', legendGpu: 'on the GPU (32 fit)', legendRam: 'in system RAM',
    random: 'IF PICKS WERE RANDOM', real: 'REAL TRACES · Qwen3-235B', hit: 'GPU hit rate', times: '3×',
    fine: 'simulation on our released traces · 71 requests, 9,082 tokens · not a run of Strata',
    paper: ['Patterns behind Chaos', 'Forecasting Data Movement for Efficient', 'Large-Scale MoE LLM Inference', 'ISCA 2026 · Best Paper'],
    data: 'traces: huggingface.co/datasets/core12345/MoE_expert_selection_trace',
    end: ['LAB · UC SAN DIEGO · PROF. YUFEI DING', '@PicassoLabUCSD'],
    cap: { h1: '125B parameters/on one gaming GPU?', h2: 'The trick: most experts/live in system memory', h3: 'Each token uses only a few,/copied over just in time',
      h4: 'If picks were random,/a GPU holding a quarter|would miss 3 times out of 4', h5: 'They’re not.|On our released Qwen3 traces,/the same space hits 77%',
      h6: 'Patterns behind chaos./Our ISCA ’26 best paper' },
  },
  zh: {
    hook: ['1250亿参数', '一张 4090 就能跑？'], hookTag: '“Strata” 登上 Hacker News 首页 · 2026 年 10 月',
    board: '一层 · 128 个专家', legendGpu: '在显卡上（放得下 32 个）', legendRam: '在内存里',
    random: '假如专家随机挑选', real: '真实数据 · Qwen3-235B', hit: '显卡命中率', times: '3×',
    fine: '基于我们公开的数据模拟 · 71 个请求、9082 个 token · 并非实测 Strata',
    paper: ['混乱背后的规律', 'Patterns behind Chaos: Forecasting Data', 'Movement for Efficient Large-Scale MoE LLM Inference', 'ISCA 2026 · 最佳论文'],
    data: '数据：huggingface.co/datasets/core12345/MoE_expert_selection_trace',
    end: ['LAB · UC SAN DIEGO · PROF. YUFEI DING', '《算力另计》热点篇'],
    cap: { h1: '一张游戏显卡/跑1250亿参数的大模型？', h2: '秘诀是/大部分专家其实放在内存里', h3: '每个词只用到其中几个/用到再搬上显卡',
      h4: '如果专家是随机选的/显卡放下四分之一|四次里有三次要现搬', h5: '但它们不是随机的|在我们公开的Qwen3数据上/同样的空间 命中率77%',
      h6: '混乱背后有规律/我们的ISCA 2026最佳论文' },
  },
};
