# the nearest good spot within 8 blocks: rings 3 to 8 blocks out (1.5 to 5 up, 5.4 blocks or more away), nearest first, each from
# behind the bot turning out both ways; the eye stays there (muse_cam:hold)
scoreboard players set #np muse_cam_y 1
function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 2
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 3
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 4
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 5
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 6
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 7
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 1 run scoreboard players set #on muse_cam_y 2
execute if score #f muse_cam_y matches 1 run scoreboard players set #hv muse_cam_y 0
