# Lab anime opening (all members)

A ~90 s anime opening with every Team page member in their avatar persona (cast.json: the personas of
people/*.html), then the whole lab together. Pipeline: member photo -> anime keyframe (Seedream 5.0 pro, photo as
reference) -> 5 s shot (Seedance 2.0 mini image-to-video, 720p, no audio) -> edit with name cards and music.
Seedance refuses photoreal faces as a first frame, so the first frames are always the anime keyframes.

    ~/miniforge3/bin/python3 gen.py still all     then look at ~/picasso-work/labop/stills
    ~/miniforge3/bin/python3 gen.py clip all
    ~/miniforge3/bin/python3 gen.py cost

Estimate: 17 keyframes x 0.3 + 17 shots x ~2.5 = ~48 yuan (cap 150 in ark.py).
State 2026-11-20: blocked, the Volcengine account is overdue (AccountOverdueError); nothing generated yet.
Open question for the owner: Prof. Ding's shot needs her OK (her course explainers never draw her likeness;
her avatar short already does, in chibi anime).
