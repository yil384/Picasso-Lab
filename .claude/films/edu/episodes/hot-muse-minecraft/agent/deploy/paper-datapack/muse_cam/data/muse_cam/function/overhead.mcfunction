# the bot not seen from the spots behind it (muse_cam:shoulder; a hole it dug in, a shaft, a burrow): a view from
# above at an angle, the first that is clear, before the one straight above its head (only its hair): 16 2.5 back and
# 4 up (58 degrees down), 17 2.5 to its right and 4 up, 18 to its left, 19 2 back and 5.5 up (70 degrees), 20 2.5 in
# front and 4 up (its face), 21 1.5 back and 2.5 up (59 degrees, under a low canopy). Each with 0.4 blocks of room and a clear line from the bot's eyes and from its shoulders
# (muse_cam:overhead_at, muse_cam:sight_try); #ao the one taken, 0 for none. The muse_cam_try marker stays on it.
scoreboard players set #ao muse_cam_y 0
# 16: 2.5 back and 4 up (58 degrees)
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^ ^ ^-2.5 run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~4 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 18
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 16
# 17: 2.5 to its right and 4 up
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^-2.5 ^ ^ run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~4 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 18
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 17
# 18: 2.5 to its left and 4 up
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^2.5 ^ ^ run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~4 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 18
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 18
# 19: 2 back and 5.5 up (70 degrees)
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^ ^ ^-2 run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~5.5 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 22
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 19
# 20: 2.5 in front and 4 up, its face
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^ ^ ^2.5 run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~4 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 18
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 20
# 21: 1.5 back and 2.5 up (59 degrees), under a low canopy
execute if score #ao muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 positioned ^ ^ ^-1.5 run tp @e[type=minecraft:marker,tag=muse_cam_try,limit=1] ~ ~2.5 ~
execute if score #ao muse_cam_y matches 0 run scoreboard players set #sd muse_cam_y 11
execute if score #ao muse_cam_y matches 0 run function muse_cam:overhead_at
execute if score #ao muse_cam_y matches 0 if score #oc muse_cam_y matches 1 run scoreboard players set #ao muse_cam_y 21
