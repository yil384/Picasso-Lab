# the bot seen from the spot the muse_cam_try marker stands at (muse_cam:shoulder): #so 1 when a line from the bot's eyes
# and one from its shoulders (0.5 lower) reach it through open blocks (#sd quarter-block steps each, to about 0.4 short of
# the spot, whose own way muse_cam:shoulder checked)
scoreboard players set #so muse_cam_y 0
scoreboard players operation #sn muse_cam_y = #sd muse_cam_y
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ facing entity @e[type=minecraft:marker,tag=muse_cam_try,limit=1] feet run function muse_cam:sight
execute if score #so muse_cam_y matches 0 run return 0
scoreboard players set #so muse_cam_y 0
scoreboard players operation #sn muse_cam_y = #sd muse_cam_y
scoreboard players add #sn muse_cam_y 1
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ positioned ~ ~-0.5 ~ facing entity @e[type=minecraft:marker,tag=muse_cam_try,limit=1] feet run function muse_cam:sight
