#!/usr/bin/env python3
"""Round 2 of the member paintings with Codex's image tool (needs a logged-in `codex` CLI; in a cloud session
`codex login --device-auth`). Each image gets three references: art/y_toast.png (the film's style, Pixar-like 3D),
the member's Team-page photo (the face) and their round-1 painting art/m_<name>.png (the outfit, so all of a
member's images wear the same clothes). Output: art/r2/<file>.png, 1024x1536 on flat #00FF00; logs in logs/.
With --yufei: the five Yufei poses from her anime short, redrawn in the design of y_toast (pose from the old image).
usage: python3 tools/gen_members.py [--jobs 3] [--force] [--yufei] [names...]"""
import argparse, concurrent.futures as cf, os, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(HERE, '../../..'))
TOAST = 'Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.'
JOBS = [
    ('m_chang', 'chang', 'A small cup of coffee in the other hand. ' + TOAST),
    ('m_haotian', 'haotian', 'A baseball cap in the other hand. ' + TOAST),
    ('m_jixuan', 'jixuan', 'A Chinese calligraphy brush in the other hand. ' + TOAST),
    ('m_keyi', 'keyi', 'A game controller in the other hand. ' + TOAST),
    ('m_parikshit', 'parikshit', 'A hiking headlamp on the forehead. ' + TOAST),
    ('m_rishabh', 'rishabh', 'A small silver stopwatch in the other hand. ' + TOAST),
    ('m_xiang', 'xiang', 'A handheld microphone in the other hand. ' + TOAST),
    ('m_xinwei', 'xinwei', 'A small steel frying pan in the other hand. ' + TOAST),
    ('m_yichen', 'yichen', 'A fanned hand of playing cards in the other hand. ' + TOAST),
    ('m_yue', 'yue', 'A wooden baseball bat resting on the shoulder, held by the other hand. ' + TOAST),
    ('m_zaifeng', 'zaifeng', 'A thick stack of papers under the other arm. ' + TOAST),
    ('m_zhengding', 'zhengding', 'Aviator sunglasses. ' + TOAST),
    ('m_zhongkai', 'zhongkai', 'A gold award medal on a ribbon around the neck. ' + TOAST),
    ('m_zhuo', 'zhuo', 'A gold medal on a red ribbon around the neck. ' + TOAST),
    ('xiang_land', 'xiang', 'A superhero landing: one knee and one fist on the ground, the other arm out behind, looking up with a determined grin.'),
    ('xiang_chip', 'xiang', 'Standing, proudly holding up in both hands at chest height a small square quantum chip that glows soft blue.'),
    ('zaifeng_flop', 'zaifeng', 'Mid-air in a comic belly-flop dive, arms and legs spread wide like a starfish, cheeks puffed, eyes squeezed shut; seen from the front, slightly from below.'),
    ('zaifeng_gpu', 'zaifeng', 'Standing, hugging a large graphics card (a GPU board with fans) against the chest like a beloved pet, a soft green glow on it, content smile.'),
    ('zhongkai_tray', 'zhongkai', 'Walking carefully, three-quarter view, carrying a small round tray with six cups of bubble milk tea, concentrating, tongue slightly out.'),
    ('zhongkai_wafer', 'zhongkai', 'Standing, holding up a round silicon wafer that shines with a rainbow sheen, presenting it with a big proud grin.'),
    ('zhongkai_offer', 'zhongkai', 'Holding one cup of bubble milk tea straight out towards the viewer with both hands, a warm smile, front view.'),
]

# Yufei poses reused from her anime short (art3d) wear a looser ponytail and cropped trousers; redo them in the
# design of the new paintings (y_toast) while keeping the pose of the old image
YJOBS = [
    ('y_surprise', 'Jumping back in surprise, both open hands up beside her face, mouth open in an O, one knee raised.'),
    ('y_proud', 'Standing proudly, feet apart, one hand on her hip, the other holding a giant paintbrush upright over her shoulder (long wooden handle, liquid gold paint dripping from the bristles), winking with a big smile.'),
    ('y_swing', 'Lunging and swinging a giant paintbrush in a wide arc with both hands, a big swirl of liquid gold paint flying off the bristles, her ponytail flying.'),
    ('y_paint_air', 'Leaping lightly, one arm stretched up holding a paintbrush that trails a ribbon of liquid gold paint in an S-curve through the air, the other arm out for balance.'),
    ('y_wave', 'Skipping forward with one leg kicked up behind her, waving happily with one hand raised, eyes closed in a big smile.'),
]
YPROMPT = ('Generate ONE portrait image (1024x1536) with your image generation tool and save it as art/r2/{f}.png in the '
           'current directory (copy the generated file there; do not write any code to draw it). Two images are attached. '
           'Redraw the pose, action, props and camera angle of IMAGE 2: {pose} But the woman must look exactly like IMAGE 1, '
           'the same character design: her face, the neat low ponytail and hair as in image 1, the thin red half-rim '
           'glasses, the navy-blue blazer over the black-and-white zigzag top, the small silver pendant, full-length dark '
           'straight trousers and dark flat shoes as in image 1. The same polished Pixar-style 3D animated film rendering '
           'and lighting as image 1. Always the FULL figure including both shoes and the whole prop, nothing cropped, centred '
           'with a small margin. Background: one perfectly flat pure green colour #00FF00, no floor, no shadow on the '
           'background, no gradient. No text, letters, numbers, logos or watermark. When the file is saved, reply with just '
           'its path.')

PROMPT = ('Generate ONE portrait image (1024x1536) with your image generation tool and save it as art/r2/{f}.png in the '
          'current directory (copy the generated file there; do not write any code to draw it). Three images are attached. '
          'IMAGE 1 is ONLY the art style reference: match its art style exactly - a polished stylized 3D animated feature '
          'film character render (Pixar style): big expressive eyes, smooth stylized skin, simplified shapes, a slightly '
          'larger head, soft cartoon proportions, soft global illumination, a soft warm key light from the upper right and a '
          'subtle cool rim light from the left. Do NOT copy that woman: not her face, hair, glasses or clothes. '
          'IMAGE 2 is a photo of the real lab member to draw: keep them clearly recognisable (face shape, hairstyle, glasses '
          'if they wear them, skin tone, build). IMAGE 3 is an earlier, too realistic draft of the same person: take only '
          'their outfit and shoes from it, and redraw everything in the style of image 1. Kind and flattering, never a '
          'caricature, not photorealistic. Pose: {pose} Always the FULL body from the top of the head to both shoes, '
          'nothing cropped, centred with a small margin, the figure about 85% of the image height. Background: one perfectly '
          'flat pure green colour #00FF00, no floor, no shadow on the background, no gradient, no other objects. No text, '
          'letters, numbers, logos or watermark. When the file is saved, reply with just its path.')


def refs_for(ph):
    os.makedirs(os.path.join(HERE, 'refs'), exist_ok=True)
    dst = os.path.join(HERE, 'refs', f'{ph}.png')
    if not os.path.exists(dst):
        im = Image.open(os.path.join(REPO, 'people/static', f'{ph}.webp')).convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
        bg.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(dst)
    return ['art/y_toast.png', f'refs/{ph}.png', f'art/m_{ph}.png']


def run(job, force):
    f, ph, pose = job
    out = os.path.join(HERE, 'art/r2', f + '.png')
    if os.path.exists(out) and not force: return f, 'skip'
    if ph is None:                                             # a Yufei redo: design from y_toast, pose from the old image
        refs, prompt = ['art/y_toast.png', os.path.join(REPO, '.claude/films/yufei/anime/art3d', f + '.png')], YPROMPT.format(f=f, pose=pose)
    else:
        refs, prompt = refs_for(ph), PROMPT.format(f=f, pose=pose)
    # low reasoning effort: the agent only calls the image tool and copies one file (saves quota); default tier, not fast
    args = ['codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', HERE, '-c', 'model_reasoning_effort="low"']
    for r in refs: args += ['-i', r]
    with open(os.path.join(HERE, 'logs', f + '.log'), 'w') as log:
        p = subprocess.run(args, input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT, timeout=900)
    return f, ('ok' if os.path.exists(out) else f'FAIL (exit {p.returncode}, logs/{f}.log)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--jobs', type=int, default=3); ap.add_argument('--force', action='store_true')
    ap.add_argument('--yufei', action='store_true'); ap.add_argument('names', nargs='*'); a = ap.parse_args()
    os.makedirs(os.path.join(HERE, 'art/r2'), exist_ok=True); os.makedirs(os.path.join(HERE, 'logs'), exist_ok=True)
    pool = [(f, None, pose) for f, pose in YJOBS] if a.yufei else JOBS
    jobs = [j for j in pool if not a.names or j[0] in a.names]
    for j in jobs:
        if j[1]: refs_for(j[1])                              # make the refs once, before the pool
    with cf.ThreadPoolExecutor(a.jobs) as ex:
        for fut in cf.as_completed([ex.submit(run, j, a.force) for j in jobs]):
            try: print(*fut.result(), flush=True)
            except Exception as e: print('ERROR', e, flush=True)
