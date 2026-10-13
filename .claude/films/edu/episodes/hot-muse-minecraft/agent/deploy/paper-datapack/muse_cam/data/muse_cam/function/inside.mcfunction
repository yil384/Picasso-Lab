# enclosed with room inside (a hut, not a one-block cell): a spot behind the bot inside it, only while the way to it is
# open and the bot is seen from it (muse_cam:behind: both lines, eyes and shoulders); #in the spot taken (14, 15), 0 for
# none: then the views from outside (muse_cam:outside)
scoreboard players set #in muse_cam_y 0
function muse_cam:behind
execute if score #p14 muse_cam_y matches 1 if score #v14 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.5 ^0.45 ^-2.3 facing ^ ^ ^12
execute if score #p14 muse_cam_y matches 1 if score #v14 muse_cam_y matches 1 run scoreboard players set #in muse_cam_y 14
execute if score #p15 muse_cam_y matches 1 if score #v15 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.7 ^0.6 ^-3.2 facing ^ ^ ^12
execute if score #p15 muse_cam_y matches 1 if score #v15 muse_cam_y matches 1 run scoreboard players set #in muse_cam_y 15
# the evidence: rule 24 once when the view goes inside
execute if score #in muse_cam_y matches 14.. unless score #rl muse_cam_y matches 24 run function muse_cam:note_inside
