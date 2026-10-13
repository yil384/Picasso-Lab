# the live camera's counters (deploy/paper-datapack/muse_cam; the camera service only sets tags through the console:
# muse_cam on the camera player, muse_cam_third for the third-person view, muse_cam_target on the bot it films)
scoreboard objectives add muse_cam_enc dummy
scoreboard objectives add muse_cam_open dummy
scoreboard objectives add muse_cam_t dummy
# the smoothed yaw of the camera, in tenths of a degree, and the constants its arithmetic needs
scoreboard objectives add muse_cam_y dummy
scoreboard players set #3600 muse_cam_y 3600
scoreboard players set #15 muse_cam_y 30
scoreboard players set #100 muse_cam_y 100
# the cool-down of a regroup (a dimension change, a respawn far away)
scoreboard objectives add muse_cam_cd dummy
# the ticks since the last regroup, for the rides asked for again after it
scoreboard objectives add muse_cam_rr dummy
# the orbit around a shut-in bot turns back with this
scoreboard players set #m1 muse_cam_y -1
# the evidence of the camera's spots (muse_cam:note): its number, and the last the camera service had printed to the
# server log (deploy/paper-datapack; src/camera.js keepFollowingCommands asks for it when they differ)
execute unless score cam_seq muse_cam_y matches 0.. run scoreboard players set cam_seq muse_cam_y 0
execute unless score cam_logged muse_cam_y matches 0.. run scoreboard players set cam_logged muse_cam_y 0
