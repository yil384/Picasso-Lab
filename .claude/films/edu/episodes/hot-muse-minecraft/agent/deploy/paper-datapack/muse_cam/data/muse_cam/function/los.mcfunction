# one half-block step of the line from a spot toward the bot's eyes: near the bot (#lo 1), a block in the way (stop),
# or on (at most 80 steps)
execute if entity @a[tag=muse_cam_target,distance=..3.2] run return run scoreboard players set #lo muse_cam_y 1
execute unless block ~ ~ ~ #muse_cam:open unless score #lv muse_cam_y matches 1 run return 0
execute unless block ~ ~ ~ #muse_cam:open unless block ~ ~ ~ #minecraft:leaves run return 0
scoreboard players add #ls muse_cam_y 1
execute if score #ls muse_cam_y matches 80.. run return 0
execute positioned ^ ^ ^0.5 run function muse_cam:los
