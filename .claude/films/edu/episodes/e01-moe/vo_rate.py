#!/usr/bin/python3
# Speech-rate check for SCRIPT.md (E01). Re-run after changing any line: python3 vo_rate.py
# EN: spoken words, numbers written out (hyphenated compounds = 1 word, "two hundred" = 2 words).
# ZH: spoken syllables; Latin words replaced by their spoken syllables:
#   DeepSeek=迪普西(3) V3=微三(2) token=托肯(2) GPU=鸡皮优(3) MoE=诶姆伊(3) ISCA=爱斯西诶(4) Zhongkai=某某(2 syllables; read in pinyin, his Chinese name is not confirmed, never guess it)
# window = beat length minus planned non-VO seconds (note slaps, silent gags, stamp, tape, lamp off/on, outro)
import re
B = [
 # beat, start, end, non-VO seconds, EN spoken, ZH spoken
 ("B0", 0.0, 7.5, 1.1,
  "six hundred seventy-one billion on the payroll. per token, thirty-seven billion on the case. seeing other patients.",
  "六千七百一十亿在编。每个托肯，三百七十亿接诊。在看别的病人。"),
 ("B1", 7.5, 18.0, 0.5,
  "deepseek v3 is a mixture of experts: a hospital, basically. rule one: every token is a patient. rule two: two hundred fifty-six specialists. you see eight.",
  "迪普西微三满血版，混合专家模型，就是家医院。院规一：每个托肯，一位病人。院规二：两百五十六位专家，你看八位。"),
 ("B2", 18.0, 20.5, 1.5, "not yet.", "暂时不用。"),
 ("B3", 20.5, 32.0, 1.4,
  "rule three: triage scores every specialist and books your top eight. eight answers, blended by score. this one. asking eight, not two hundred fifty-six: that's the whole trick.",
  "院规三：分诊台给专家打分，挂前八名。八份意见，按分数合成一份。就这家。问八位，不问全部，省就省在这。"),
 ("B4", 32.0, 41.0, 1.8,
  "we made those signs up. nobody assigns specialties; they're learned from patients. rule four: no patients, no learning.",
  "以上门牌，纯属虚构。专长没人分配，是看病人看出来的。院规四：没病人，学不会。"),
 ("B5", 41.0, 50.5, 1.3,
  "add a crowd. left alone, triage keeps picking the same few. now there is. the rest barely see a patient, barely learn.",
  "来一群病人。没人管，分诊台总挂那几位。现在要了。其余的，没什么病人，也学不到什么。"),
 ("B6", 50.5, 58.5, 2.2,
  "deepseek v3's fix: quietly bump busy specialists down the list. balanced. done? not quite.",
  "迪普西微三的办法：太忙的，悄悄往后排。平衡了。完事了？还没。"),
 ("B7", 58.5, 69.5, 1.6,
  "that tower is one layer. there are fifty-eight. when it writes, deepseek v3 gives each specialist its own building. three hundred twenty gpus.",
  "这整栋楼，只是一层。一共五十八层，层层挂号。写答案的时候，一位专家独占一栋楼。三百二十块鸡皮优。"),
 ("B8", 69.5, 81.0, 3.0,
  "every token, every layer: shuttle out to eight buildings, shuttle back. times every request. moe saves the thinking. not the legwork.",
  "每个托肯，每一层，坐车去八栋楼，再坐回来。再乘上所有请求。诶姆伊省的是算力，省不了跑腿。"),
 ("B9", 81.0, 102.0, 3.6,
  "our own paper says random, on page one. then it shows why it isn't. zhongkai, who taught this lecture, led a study of over twenty-four thousand requests. regulars. a bet. control group: one cat. twenty percent. a notebook that knows one door from your last tower: fifty.",
  "我们自己的论文，第一页就写着随机。然后整篇都在说：不是。教这节课的某某，带头分析了两万四千多个请求。常客。打个赌。对照组：一只猫，两成。一个本子，只看你上一栋进了哪扇门：五成。"),
 ("B10", 102.0, 117.5, 1.5,
  "read the question, place the specialists: up to one point two five times faster expert math on today's gpus. best paper award, isca twenty twenty-six. simulated wafer-scale gpu: six point six times the moe throughput, on average.",
  "按读题时的规律摆专家：现有鸡皮优：专家计算最多快一点二五倍。爱斯西诶二零二六最佳论文奖。模拟的晶圆级鸡皮优上，诶姆伊吞吐平均六点六倍。"),
 ("B11", 117.5, 129.5, 4.0,
  "not for regulars. patients used to wait for the specialist. read the patterns, and the specialist can be waiting for you.",
  "常客不用。以前是病人等专家；看懂了规律，就能让专家等病人。"),
]
def en_words(s):
    """Spoken English words in s. Returns (count, None) or (None, 'error')."""
    if not isinstance(s, str):
        return None, 'EN line is not text'
    return len(re.findall(r"[a-z0-9'][a-z0-9'-]*", s.lower())), None


def zh_syl(s):
    """Spoken Chinese syllables (one per character) in s. Returns (count, None) or (None, 'error')."""
    if not isinstance(s, str):
        return None, 'ZH line is not text'
    return len(re.findall(r"[\u4e00-\u9fff]", s)), None


def report(beats):
    """Rate per beat and in total. Returns (lines, None) or (None, 'error')."""
    out = [f"{'beat':4} {'span':>13} {'len':>5} {'win':>5} {'EN w':>5} {'w/s':>5} {'ZH syl':>6} {'syl/s':>6}"]
    te = tz = tw = 0
    for b, s, e, q, en, zh in beats:
        w = e - s - q
        if w <= 0:
            return None, f'{b}: no time left for the voice-over'
        a, err = en_words(en)
        if err:
            return None, f'{b}: {err}'
        z, err = zh_syl(zh)
        if err:
            return None, f'{b}: {err}'
        te += a; tz += z; tw += w
        flag = ('  EN!' if a / w > 2.8 else '') + ('  ZH!' if z / w > 4.5 else '')
        out.append(f'{b:4} {s:6.1f}-{e:6.1f} {e - s:5.1f} {w:5.1f} {a:5d} {a / w:5.2f} {z:6d} {z / w:6.2f}{flag}')
    T = beats[-1][2]
    out.append(f'TOTAL {T:.1f} s | VO windows {tw:.1f} s | EN {te} words: {te / tw:.2f} w/s in windows, {te / T:.2f} over film | '
               f'ZH {tz} syl: {tz / tw:.2f}/s in windows, {tz / T:.2f} over film')
    return out, None


if __name__ == '__main__':
    lines, err = report(B)
    if err:
        raise SystemExit(err)
    print('\n'.join(lines))
