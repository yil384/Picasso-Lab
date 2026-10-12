# the orbit around an enclosed bot: 5 blocks out and 3.5 up, turned to the bot, 0.3 degrees a tick (a round a minute),
# only through good spots (muse_cam:good); blocked one way it turns back; blocked both ways it stays while its own spot
# is good, else a new spot is chosen (muse_cam:choose, in the same tick)
execute at @a[tag=muse_cam_target,limit=1] run tp @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] ~ ~ ~
scoreboard players set #ok muse_cam_y 0
function muse_cam:orbit_step
execute if score #ok muse_cam_y matches 0 run scoreboard players operation #od muse_cam_y *= #m1 muse_cam_y
execute if score #ok muse_cam_y matches 0 run function muse_cam:orbit_step
execute if score #ok muse_cam_y matches 0 as @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] at @s run function muse_cam:good
execute if score #ok muse_cam_y matches 0 if score #g muse_cam_y matches 1 as @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] at @s run tp @s ~ ~ ~ facing entity @a[tag=muse_cam_target,limit=1] eyes
execute if score #ok muse_cam_y matches 0 if score #g muse_cam_y matches 0 run scoreboard players set #on muse_cam_y 0
