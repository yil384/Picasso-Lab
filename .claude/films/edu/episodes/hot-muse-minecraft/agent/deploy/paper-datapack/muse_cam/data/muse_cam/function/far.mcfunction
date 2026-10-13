# no spot sees the shelter (trees all round, a hillside): a view of the place from outside anyway, never a wall in front
# of the lens (muse_cam:good_far: room, 5.4 blocks or more away, 4 blocks of open line toward the bot), 8 out and 8 up
# (45 degrees) in 8 directions, else 3 out and 12 up; the HUD says the body is sheltered
scoreboard players set #np muse_cam_y 8
function muse_cam:near_dirs
execute if score #f muse_cam_y matches 0 run scoreboard players set #np muse_cam_y 9
execute if score #f muse_cam_y matches 0 run function muse_cam:near_dirs
execute if score #f muse_cam_y matches 1 run scoreboard players set #on muse_cam_y 2
execute if score #f muse_cam_y matches 1 run scoreboard players set #hv muse_cam_y 2
