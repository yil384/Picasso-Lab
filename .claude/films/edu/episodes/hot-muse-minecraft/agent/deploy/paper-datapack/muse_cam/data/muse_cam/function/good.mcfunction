# a spot the camera may film from (where this runs): it and the air 0.4 around it open (the eye never touches a block,
# so the picture never shows a block from inside), 5.4 blocks or more from the bot, and a straight line from it toward the bot's eyes through open
# air (leaves block it: the camera draws them opaque) until it is within 3.2 blocks of the bot: it sees the shelter itself, not a tree or a
# wall of rock. #g 1 when it is; the spot is kept on the muse_cam_spot marker.
scoreboard players set #g muse_cam_y 0
execute unless block ~ ~ ~ #muse_cam:open run return 0
execute unless block ~0.4 ~ ~ #muse_cam:open run return 0
execute unless block ~-0.4 ~ ~ #muse_cam:open run return 0
execute unless block ~ ~ ~0.4 #muse_cam:open run return 0
execute unless block ~ ~ ~-0.4 #muse_cam:open run return 0
execute unless block ~ ~0.4 ~ #muse_cam:open run return 0
execute unless block ~ ~-0.4 ~ #muse_cam:open run return 0
# at least 5.4 blocks from the bot: the line then runs 2.2 blocks or more through open air before the shelter (3.2), so
# the shelter is seen whole, never a wall filling the picture (gaf8c9e: a spot 3 out and 2 up beside the trench the
# bot had dug, a dirt wall across the frame)
execute if entity @a[tag=muse_cam_target,distance=..5.4] run return 0
scoreboard players set #ls muse_cam_y 0
scoreboard players set #lo muse_cam_y 0
execute facing entity @a[tag=muse_cam_target,limit=1] eyes run function muse_cam:los
execute if score #lo muse_cam_y matches 0 run return 0
scoreboard players set #g muse_cam_y 1
tp @e[type=minecraft:marker,tag=muse_cam_spot,limit=1] ~ ~ ~
