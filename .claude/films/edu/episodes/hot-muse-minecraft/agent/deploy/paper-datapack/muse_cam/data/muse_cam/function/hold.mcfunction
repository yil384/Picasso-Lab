# a fixed spot: kept while it stays good (with the leaves rule it was chosen by), turned to the bot; else a new spot.
# Every 10 s the ring is tried again (the orbit is livelier).
scoreboard players operation #lv muse_cam_y = #hv muse_cam_y
execute as @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] at @s run function muse_cam:good
scoreboard players set #lv muse_cam_y 0
execute if score #g muse_cam_y matches 1 as @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] at @s run tp @s ~ ~ ~ facing entity @a[tag=muse_cam_target,limit=1] eyes
execute if score #g muse_cam_y matches 0 run scoreboard players set #on muse_cam_y 0
scoreboard players add #hold muse_cam_y 1
execute if score #hold muse_cam_y matches 200.. run scoreboard players set #on muse_cam_y 0
