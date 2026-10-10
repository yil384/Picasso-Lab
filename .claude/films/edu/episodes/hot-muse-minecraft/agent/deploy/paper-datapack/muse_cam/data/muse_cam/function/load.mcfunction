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
