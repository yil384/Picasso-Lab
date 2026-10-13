# one quarter-block step of a line from the bot toward a spot (muse_cam:sight_try): open all the way (#so 1 once #sn
# steps are done), or a block in the way, leaves too (the camera's fast graphics draw leaves opaque)
scoreboard players remove #sn muse_cam_y 1
execute if score #sn muse_cam_y matches ..0 run return run scoreboard players set #so muse_cam_y 1
execute unless block ~ ~ ~ #muse_cam:open run return 0
execute positioned ^ ^ ^0.25 run function muse_cam:sight
