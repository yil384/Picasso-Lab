# the bot is enclosed: film it from outside, never from inside a block, never against a ceiling. #on says how:
# 0 choose a spot (muse_cam:choose), 1 the orbit (5 blocks out and 3.5 up, turning slowly), 2 a fixed spot (the
# nearest good one within 8 blocks, or high above), 3 none outside (sealed in under rock): first person. Every spot
# the eye stands at passes muse_cam:good, each tick: open air with room around it, and a clear line to the shelter.
execute if score #on muse_cam_y matches 1 run function muse_cam:orbit
execute if score #on muse_cam_y matches 2 run function muse_cam:hold
execute if score #on muse_cam_y matches 3 run function muse_cam:deep
execute if score #on muse_cam_y matches 0 run function muse_cam:choose
