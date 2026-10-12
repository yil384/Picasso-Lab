# the bot shut in (a shelter at night, waiting): the eye circles it slowly instead of standing still, 5 blocks out and
# 3.5 up, turned to the bot, 0.3 degrees a tick (a round a minute), only through open air (the spot, a block above and
# below it); at a wall it turns back. The first tick starts behind the bot (the camera's smoothed yaw), near the eye.
execute unless score #on muse_cam_y matches 1 run scoreboard players operation #oa muse_cam_y = #c muse_cam_y
execute unless score #on muse_cam_y matches 1 run scoreboard players set #od muse_cam_y 3
scoreboard players set #on muse_cam_y 1
execute unless entity @e[type=minecraft:marker,tag=muse_cam_orbit] at @a[tag=muse_cam_target,limit=1] run summon minecraft:marker ~ ~ ~ {Tags:["muse_cam_orbit"]}
execute at @a[tag=muse_cam_target,limit=1] run tp @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] ~ ~ ~
scoreboard players set #ok muse_cam_y 0
function muse_cam:orbit_step
execute if score #ok muse_cam_y matches 0 run scoreboard players operation #od muse_cam_y *= #m1 muse_cam_y
execute if score #ok muse_cam_y matches 0 run function muse_cam:orbit_step
