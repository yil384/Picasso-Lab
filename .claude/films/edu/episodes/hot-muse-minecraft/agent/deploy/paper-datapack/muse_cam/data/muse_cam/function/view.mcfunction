# what the camera rides: the eye in third person (muse_cam_third), and in first person while the bot is enclosed;
# otherwise the bot's head (and while it is enclosed with no spot outside). Every 5 s the ride is asked for again (a client that reconnected lost it).
scoreboard players add #t muse_cam_t 1
execute if score #t muse_cam_t matches 100.. run tag @a[tag=muse_cam] remove muse_cam_ineye
execute if score #t muse_cam_t matches 100.. run tag @a[tag=muse_cam] remove muse_cam_inhead
execute if score #t muse_cam_t matches 100.. run scoreboard players set #t muse_cam_t 0
# enclosed with no spot outside (muse_cam:deep): through the bot's own eyes
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut,tag=muse_cam_deep] as @a[tag=muse_cam,tag=!muse_cam_inhead] run function muse_cam:to_head
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut,tag=muse_cam_deep] run return 0
# in third person the eye, except in first person over the shoulder (muse_cam_fp, muse_cam:shoulder: a spot at or just
# ahead of the bot's eyes would put the camera inside its head): then the bot's head, its own model not drawn
execute as @a[tag=muse_cam,tag=muse_cam_third,tag=!muse_cam_fp,tag=!muse_cam_ineye] run function muse_cam:to_eye
execute as @a[tag=muse_cam,tag=muse_cam_third,tag=muse_cam_fp,tag=!muse_cam_inhead] run function muse_cam:to_head
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut] as @a[tag=muse_cam,tag=!muse_cam_third,tag=!muse_cam_ineye] run function muse_cam:to_eye
execute unless entity @a[tag=muse_cam_target,tag=muse_cam_shut] as @a[tag=muse_cam,tag=!muse_cam_third,tag=!muse_cam_inhead] run function muse_cam:to_head
