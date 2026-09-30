# 手机端排版：为什么丑，怎么修

## 根因（Google Sites 的规则，决定了能改什么）

1. **原生文字框的对齐是全站统一的，没有“只在手机上”的选项。** 现在的正文是两端对齐（justify）。桌面一行十几个词，看不出来；手机一行只有 5–8 个词，两端对齐把多余空隙摊到词与词之间，出现一道道白色“河流”（Home 三段、Prof 页 Bio、Team 每个人的简介都是）。
2. **嵌入框（embed）是固定宽高比的盒子。** 源码里是 `padding-top: 106.7%` 这种写法：宽度跟着栏宽走，高度 = 宽 × 比例。手机上 Sites 把同一行的几个盒子竖着排，每个盒子几乎保持桌面尺寸（266×284 → 257×274），中间再加 Sites 固定的约 48px 间距。所以：
   - 页脚三格（校徽 / 地址 / 访客地图）在手机上变成三段黑色长条；
   - Team 页每个头像框比头像本身高，头像底下到名字之间空一大段。
3. **嵌入代码跑在 Google 的沙盒 iframe 里**（随机的 `*-atari-embeds.googleusercontent.com` 源），改不到外层页面的 CSS，只能改自己框里的内容。
4. **整页嵌入（Full page embed）完全由我们的 HTML 控制。** 所以 Blogs / Projects / Teaching / Publications / Events 这几页在手机上本来就好看；难看的都是原生内容页：Home、Team、Prof 页、Sponsors。

结论：原生页面的问题靠 **(A) 嵌入框自己适配手机** + **(B) 编辑器里少量手动修改** 解决；Sponsors 这种没有 SEO 价值、全是图片的页面，直接换成整页嵌入。Home、Prof 页、Team 页保持原生文字（Google 搜索会索引原生文字，嵌入框里的文字不会被当作页面内容索引，这几页对“Yufei Ding UCSD”之类的搜索很重要，不建议整页嵌入）。

## (A) 这个分支里已经改好的文件（需要重新粘贴到 Sites 才生效）

| 文件 | Sites 页面 / 位置 | 改了什么 |
|---|---|---|
| `home/address.html` | 页脚中间那格（每页都有） | 地址不再两端对齐；手机上在框里居中、标题不折行；如果框是宽的（见下面第 4 步），自动变成 [校徽 \| 地址] 并排 |
| `home/ucsd.html` | 页脚左边的校徽格 | 手机上校徽在框里居中，和下面的地址卡对齐 |
| `sponsors/sponsors.html` | Sponsors 页（新，整页嵌入） | 替换原来的标题 + 9 张 logo 图：手机两列、桌面三列的 logo 墙，分“政府与国家实验室 / 企业”两组 |
| `events/events.html` | Events 页 | 手机上弹幕输入栏右移，让开 Sites 左下角的 (i) 按钮（之前 (i) 正好盖住“添加图片”按钮，点不到） |
| `people/*.html`（在职成员；xinwei / haotian / yufei 和 alumni 不动） | Team 页每个人的头像格 | 头像按框的实际大小排版；手机上头像贴框底居中，把空白让到上一个人和这个人之间，而不是头像和名字之间 |

复制命令（Mac）：`pbcopy < home/address.html`，然后在 Sites 里双击对应的嵌入框 → 编辑代码 → 全选粘贴 → 下一步 → 插入 → 发布。

## (B) 编辑器里的手动修改（约 10 分钟）

1. **正文改左对齐**：Home 的三段、Prof 页的 Bio 和 Openings、Team 页每个人的简介。点进文字框 → `Ctrl+A`（Mac `⌘A`）→ `Ctrl+Shift+L`（Mac `⌘⇧L`）左对齐。桌面上看几乎没区别，手机上“河流”就没了。
2. **删掉多余空行**：Sponsors 页标题那种把一句话拆成三行、行距很大的，Home 页 logo 和引言之间的空段落。空段落在手机上每个都会变成一整行空白。
3. **Sponsors 换成整页嵌入**：和 Blogs / Projects 的做法一样（整页嵌入），粘贴 `sponsors/sponsors.html`；原来的标题文字框和 9 张 logo 图删掉。
4. **（推荐）页脚合并两格**：删掉左边的校徽格，把地址格拖宽到原来两格的宽度，再粘贴新的 `home/address.html`。手机上页脚从三段变两段，桌面上是 [校徽 | PICASSO LAB 地址] 并排，一样好看。如果不想动页脚结构，只重新粘贴 `home/ucsd.html` 和 `home/address.html` 也行。
5. **Team 页头像格**：重新粘贴新的 `people/*.html` 即可，框的大小不用动。

## 验证

- 手机上打开 https://yufeiding.ucsd.edu/ 的每一页，或者 Chrome 开发者工具 → 设备工具栏 → iPhone 12/13/14（390×844）。
- 嵌入框用 `screen.width` 判断是不是手机（框本身在手机和桌面上差不多大，只能看设备）。自动化测试工具的设备模拟有时不会把手机尺寸传进跨域 iframe，看到“没居中”时以真机为准。
