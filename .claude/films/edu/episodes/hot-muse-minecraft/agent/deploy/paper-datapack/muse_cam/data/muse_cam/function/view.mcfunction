# what the camera rides: the eye in third person (muse_cam_third), and in first person while the bot is enclosed;
# otherwise the bot's head. Every 5 s the ride is asked for again (a client that reconnected lost it).
scoreboard players add #t muse_cam_t 1
execute if score #t muse_cam_t matches 100.. run tag @a[tag=muse_cam] remove muse_cam_ineye
execute if score #t muse_cam_t matches 100.. run tag @a[tag=muse_cam] remove muse_cam_inhead
execute if score #t muse_cam_t matches 100.. run scoreboard players set #t muse_cam_t 0
execute as @a[tag=muse_cam,tag=muse_cam_third,tag=!muse_cam_ineye] run function muse_cam:to_eye
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut] as @a[tag=muse_cam,tag=!muse_cam_third,tag=!muse_cam_ineye] run function muse_cam:to_eye
execute unless entity @a[tag=muse_cam_target,tag=muse_cam_shut] as @a[tag=muse_cam,tag=!muse_cam_third,tag=!muse_cam_inhead] run function muse_cam:to_head
