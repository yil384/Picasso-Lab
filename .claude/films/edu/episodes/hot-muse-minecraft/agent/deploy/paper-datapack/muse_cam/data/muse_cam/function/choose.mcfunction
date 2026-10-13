# a spot for the camera while the bot is enclosed, the best first: the orbit's ring (from behind the bot, then turning
# out both ways), the nearest good spot within 8 blocks, a view from high above (through leaves too); else first
# person until a spot frees up (tried again every 2 s)
tag @a[tag=muse_cam_target] remove muse_cam_deep
execute unless entity @e[type=minecraft:marker,tag=muse_cam_orbit] at @a[tag=muse_cam_target,limit=1] run summon minecraft:marker ~ ~ ~ {Tags:["muse_cam_orbit"]}
execute unless entity @e[type=minecraft:marker,tag=muse_cam_spot] at @a[tag=muse_cam_target,limit=1] run summon minecraft:marker ~ ~ ~ {Tags:["muse_cam_spot"]}
execute at @a[tag=muse_cam_target,limit=1] run tp @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] ~ ~ ~
scoreboard players set #f muse_cam_y 0
scoreboard players set #lv muse_cam_y 0
scoreboard players set #hold muse_cam_y 0
function muse_cam:ring
execute if score #f muse_cam_y matches 0 run function muse_cam:near
execute if score #f muse_cam_y matches 0 run function muse_cam:above
execute if score #f muse_cam_y matches 0 run tag @a[tag=muse_cam_target] add muse_cam_deep
execute if score #f muse_cam_y matches 0 run scoreboard players set #on muse_cam_y 3
# the evidence (muse_cam:note_new): the rule that picked the spot (1 the ring, 2 the nearest within 8 blocks, 3 from
# above, 4 none outside: first person)
execute if score #on muse_cam_y matches 1 run scoreboard players set #rl muse_cam_y 1
execute if score #on muse_cam_y matches 2 if score #hv muse_cam_y matches 0 run scoreboard players set #rl muse_cam_y 2
execute if score #on muse_cam_y matches 2 if score #hv muse_cam_y matches 1 run scoreboard players set #rl muse_cam_y 3
execute if score #on muse_cam_y matches 3 run scoreboard players set #rl muse_cam_y 4
function muse_cam:note_new
