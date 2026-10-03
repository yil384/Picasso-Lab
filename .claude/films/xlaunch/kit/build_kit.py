#!/usr/bin/env python3
"""Refresh the local-render kit from the video-kit worktree (../vk, branch video/x-launch): copies the pv runtime
(runtime, vendor, fonts) and the film's generated assets (the cut-out characters + relief maps + ink actually used,
the paper pages, data.json, team.jpg, logo.png) into kit/assets, syncs the scene code into ../scene, and writes
kit/manifest.txt for get.sh (repo path, kit path, code|asset).   usage: python3 kit/build_kit.py [--vk ~/vk]"""
import argparse, os, re, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); XL = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(XL, '../../..'))
ap = argparse.ArgumentParser(); ap.add_argument('--vk', default=os.path.expanduser('/home/user/vk')); a = ap.parse_args()
PIPE = os.path.join(a.vk, 'video-kit/pipeline'); FILM = os.path.join(a.vk, 'video-kit/films/xfilm')
A = os.path.join(HERE, 'assets'); SC = os.path.join(XL, 'scene')
CODE = ['film9.html', 'studio.js', 'layouts.js', 'lib.js', 'sprite.js', 'type.js', 'props.js']
for f in CODE: shutil.copy2(os.path.join(FILM, f), os.path.join(SC, f))
if os.path.exists(A): shutil.rmtree(A)
for d in ('runtime', 'vendor', 'fonts'): shutil.copytree(os.path.join(PIPE, d), os.path.join(A, 'pv', d))
src = open(os.path.join(FILM, 'film9.html')).read() + open(os.path.join(FILM, 'props.js')).read()
used = set(re.findall(r"'([a-z]+_[a-z_]+)'", src)) | {f'm_{m}' for m in re.findall(r"'(chang|haotian|jixuan|keyi|ohm|parikshit|rishabh|xiang|xinwei|yanju|yichen|yilin|yue|zaifeng|zhengding|zhongkai|zhuo|zihan)'", src)}
os.makedirs(os.path.join(A, 'cut'))
for f in sorted(os.listdir(os.path.join(FILM, 'cut'))):
    stem = f[:-4].replace('_d', '') if f.endswith('_d.png') else f[:-4]
    if stem in used or stem.replace('ink_', '') in used or f.startswith('ink_'): shutil.copy2(os.path.join(FILM, 'cut', f), os.path.join(A, 'cut', f))
shutil.copytree(os.path.join(FILM, 'pages'), os.path.join(A, 'pages'))
for f in ('data.json', 'team.jpg', 'logo.png'): shutil.copy2(os.path.join(FILM, f), os.path.join(A, f))
rel = lambda p: os.path.relpath(p, REPO)
lines = [f'{rel(os.path.join(HERE, f))} {f} code' for f in ('render.html', 'start.command')]
lines += [f'{rel(os.path.join(SC, f))} scene/{f} code' for f in CODE]
for root, _, files in os.walk(os.path.join(SC, 'tex')):
    for f in files: p = os.path.join(root, f); lines.append(f'{rel(p)} scene/{os.path.relpath(p, SC)} asset')
for root, _, files in os.walk(A):
    for f in sorted(files):
        p = os.path.join(root, f); r = os.path.relpath(p, A)
        lines.append(f'{rel(p)} {r if r.startswith("pv/") else "scene/" + r} {"code" if r.startswith("pv/runtime") else "asset"}')
open(os.path.join(HERE, 'manifest.txt'), 'w').write('\n'.join(lines) + '\n')
print(len(lines), 'files in the manifest')
