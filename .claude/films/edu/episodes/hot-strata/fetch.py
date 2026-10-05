import os, json, urllib.request, urllib.parse
T = os.environ['HF_TOKEN']; BASE = 'https://huggingface.co'
REPO = 'core12345/MoE_expert_selection_trace'; M = 'Qwen/Qwen3-235B-A22B-FP8'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'qwen')
def get(url):
    r = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + T}); return urllib.request.urlopen(r, timeout=120).read()
def tree(p):
    return json.loads(get(f'{BASE}/api/datasets/{REPO}/tree/main/{urllib.parse.quote(p)}'))
subs = ['mmlu/anatomy', 'mmlu/college_computer_science', 'mmlu/high_school_mathematics', 'mmlu/world_religions', 'livecodebench/execution', 'HuggingFaceH4/aime_2024', 'hellaswag']
n = 0
for s in subs:
    try: items = [x for x in tree(f'{M}/{s}') if x['type'] == 'file'][:25]
    except Exception as e: print('skip', s, e); continue
    for x in items:
        dst = os.path.join(OUT, x['path'].replace('/', '__'))
        if os.path.exists(dst): continue
        open(dst, 'wb').write(get(f'{BASE}/datasets/{REPO}/resolve/main/{urllib.parse.quote(x["path"])}')); n += 1
    print(s, len(items), flush=True)
print('downloaded', n)
