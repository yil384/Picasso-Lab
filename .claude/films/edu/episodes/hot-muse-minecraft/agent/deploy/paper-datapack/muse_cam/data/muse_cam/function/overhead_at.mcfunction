# a view from above at the muse_cam_try marker (muse_cam:overhead): #oc 1 when it has 0.4 blocks of open room around it
# and the bot is seen from it (muse_cam:sight_try, #sd quarter-block steps)
scoreboard players set #oc muse_cam_y 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~ ~ ~ #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~0.4 ~ ~ #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~-0.4 ~ ~ #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~ ~ ~0.4 #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~ ~ ~-0.4 #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~ ~0.4 ~ #muse_cam:open run return 0
execute at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] unless block ~ ~-0.4 ~ #muse_cam:open run return 0
function muse_cam:sight_try
scoreboard players operation #oc muse_cam_y = #so muse_cam_y
