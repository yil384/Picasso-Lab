# the evidence of a change of the spot over the shoulder (muse_cam:shoulder)
scoreboard players operation #rl muse_cam_y = #sr muse_cam_y
scoreboard players operation #sl muse_cam_y = #sr muse_cam_y
scoreboard players set #nc muse_cam_y 100
function muse_cam:note_new
