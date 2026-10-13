# a spot for a view of the place from outside when no spot sees the shelter (muse_cam:far): it and the air 0.4 around it
# open, 5.4 blocks or more from the bot, and its line toward the bot open for 4 blocks (a hillside, a canopy, the ground
# over a shelter dug in: never a block in front of the lens). #g 1 when it is; the spot is kept on the muse_cam_spot marker.
scoreboard players set #g muse_cam_y 0
execute unless block ~ ~ ~ #muse_cam:open run return 0
execute unless block ~0.4 ~ ~ #muse_cam:open run return 0
execute unless block ~-0.4 ~ ~ #muse_cam:open run return 0
execute unless block ~ ~ ~0.4 #muse_cam:open run return 0
execute unless block ~ ~ ~-0.4 #muse_cam:open run return 0
execute unless block ~ ~0.4 ~ #muse_cam:open run return 0
execute unless block ~ ~-0.4 ~ #muse_cam:open run return 0
execute if entity @a[tag=muse_cam_target,limit=1,distance=..5.4] run return 0
scoreboard players set #ls muse_cam_y 72
scoreboard players set #lo muse_cam_y 0
execute facing entity @a[tag=muse_cam_target,limit=1] eyes run function muse_cam:los
execute if score #lo muse_cam_y matches 0 if score #ls muse_cam_y matches ..79 run return 0
scoreboard players set #g muse_cam_y 1
tp @e[type=minecraft:marker,tag=muse_cam_spot,limit=1] ~ ~ ~
