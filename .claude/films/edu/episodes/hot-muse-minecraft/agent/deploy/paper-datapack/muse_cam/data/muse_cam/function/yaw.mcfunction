# the camera turns after the bot instead of with it: each tick its yaw closes 30 % of the gap to the bot's (the short
# way round), so a snapped 180 degree turn becomes a quarter-second swing around the bot, never a cut through it
execute store result score #b muse_cam_y run data get entity @a[tag=muse_cam_target,limit=1] Rotation[0] 10
scoreboard players operation #d muse_cam_y = #b muse_cam_y
scoreboard players operation #d muse_cam_y -= #c muse_cam_y
scoreboard players add #d muse_cam_y 1800
scoreboard players operation #d muse_cam_y %= #3600 muse_cam_y
scoreboard players remove #d muse_cam_y 1800
scoreboard players operation #d muse_cam_y *= #15 muse_cam_y
scoreboard players operation #d muse_cam_y /= #100 muse_cam_y
scoreboard players operation #c muse_cam_y += #d muse_cam_y
scoreboard players operation #c muse_cam_y %= #3600 muse_cam_y
# the marker that holds it stays at the bot (a teleport with no rotation keeps its own); no other line touches it
execute unless entity @e[type=minecraft:marker,tag=muse_cam_yaw] at @a[tag=muse_cam_target,limit=1] run summon minecraft:marker ~ ~ ~ {Tags:["muse_cam_yaw"]}
execute at @a[tag=muse_cam_target,limit=1] run tp @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] ~ ~ ~
execute store result entity @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] Rotation[0] float 0.1 run scoreboard players get #c muse_cam_y
