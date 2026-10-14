# the evidence of a camera spot, kept in storage muse_cam:spot for the server log (the camera service asks the console
# for it after each new one: src/camera.js keepFollowingCommands): the rule that picked it (#rl: 1 the ring, 2 the
# nearest within 8 blocks, 3 from above, 5 the place from outside with no line to the shelter, 4 none outside, 11 the bot's eyes, 12 just ahead of them, 13 above its head,
# 14 and 15 behind it, 16 to 21 from above at an angle (muse_cam:overhead), 22 behind it in a tunnel, 24 inside a shelter behind it (muse_cam:inside); hidden 1 when no spot behind had seen the bot for a second, seen 1 when one sees it now),
# the eye and the bot (position, dimension, the bot's facing), and the blocks around as characters ("." open, "L"
# leaves, "#" anything else): col, the bot's column from its feet 24 blocks up; ring, the 8 blocks around its head
# then around its feet; eye, the eye's block and its 6 neighbours
execute store result storage muse_cam:spot rule int 1 run scoreboard players get #rl muse_cam_y
execute store result storage muse_cam:spot time long 1 run time query gametime
execute store result storage muse_cam:spot hidden int 1 run scoreboard players get #hd muse_cam_y
execute store result storage muse_cam:spot seen int 1 run scoreboard players get #vis muse_cam_y
execute store result storage muse_cam:spot fp int 1 if entity @a[tag=muse_cam,tag=muse_cam_fp]
data modify storage muse_cam:spot eye set from entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos
data modify storage muse_cam:spot bot set from entity @a[tag=muse_cam_target,limit=1] Pos
data modify storage muse_cam:spot facing set from entity @a[tag=muse_cam_target,limit=1] Rotation
data modify storage muse_cam:spot dim set from entity @a[tag=muse_cam_target,limit=1] Dimension
data modify storage muse_cam:spot tmp set value []
execute at @a[tag=muse_cam_target,limit=1] run function muse_cam:note_col
data modify storage muse_cam:spot col set from storage muse_cam:spot tmp
data modify storage muse_cam:spot tmp set value []
execute at @a[tag=muse_cam_target,limit=1] run function muse_cam:note_ring
data modify storage muse_cam:spot ring set from storage muse_cam:spot tmp
data modify storage muse_cam:spot tmp set value []
execute at @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] run function muse_cam:note_eye
data modify storage muse_cam:spot eyeb set from storage muse_cam:spot tmp
data remove storage muse_cam:spot tmp
scoreboard players add cam_seq muse_cam_y 1
execute store result storage muse_cam:spot seq int 1 run scoreboard players get cam_seq muse_cam_y
