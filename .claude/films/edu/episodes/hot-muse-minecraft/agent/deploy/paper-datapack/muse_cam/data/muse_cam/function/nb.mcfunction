# one block of the evidence (muse_cam:note), where this runs: "." open, "L" leaves, "#" anything else
execute if block ~ ~ ~ #muse_cam:open run return run data modify storage muse_cam:spot tmp append value "."
execute if block ~ ~ ~ #minecraft:leaves run return run data modify storage muse_cam:spot tmp append value "L"
data modify storage muse_cam:spot tmp append value "#"
