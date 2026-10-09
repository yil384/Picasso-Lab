# enclosed: the block right above the bot's head is neither open nor leaves (a shelter's roof, rock in a tunnel). A
# second of it before the view changes, a second without it before it changes back.
execute as @a[tag=muse_cam_target] at @s unless block ~ ~2 ~ #muse_cam:open unless block ~ ~2 ~ #minecraft:leaves run scoreboard players add @s muse_cam_enc 1
execute as @a[tag=muse_cam_target] at @s unless block ~ ~2 ~ #muse_cam:open unless block ~ ~2 ~ #minecraft:leaves run scoreboard players set @s muse_cam_open 0
execute as @a[tag=muse_cam_target] at @s if block ~ ~2 ~ #muse_cam:open run scoreboard players add @s muse_cam_open 1
execute as @a[tag=muse_cam_target] at @s if block ~ ~2 ~ #minecraft:leaves run scoreboard players add @s muse_cam_open 1
execute as @a[tag=muse_cam_target,scores={muse_cam_open=1..}] run scoreboard players set @s muse_cam_enc 0
execute as @a[tag=muse_cam_target,scores={muse_cam_enc=20..}] run tag @s add muse_cam_shut
execute as @a[tag=muse_cam_target,scores={muse_cam_open=20..}] run tag @s remove muse_cam_shut
scoreboard players set @a[scores={muse_cam_enc=100..}] muse_cam_enc 100
scoreboard players set @a[scores={muse_cam_open=100..}] muse_cam_open 100
