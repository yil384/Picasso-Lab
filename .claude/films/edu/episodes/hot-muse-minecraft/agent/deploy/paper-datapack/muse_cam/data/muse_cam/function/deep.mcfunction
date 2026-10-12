# sealed in with no spot outside (under rock): the camera sees through the bot's own eyes (muse_cam:view); a spot is
# looked for again every 2 s
scoreboard players add #hold muse_cam_y 1
execute if score #hold muse_cam_y matches 40.. run scoreboard players set #on muse_cam_y 0
