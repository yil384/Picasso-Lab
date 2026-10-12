# enclosed: a roof right above the bot's head (neither open nor leaves; a portal block counts as open: a bot waiting
# in a portal stays over the shoulder) and walls on all four sides at head height (a closed shelter, a sealed hole).
# A tunnel or a shaft is not enclosed: its open side or top is where the camera follows from. A second of it before
# the view changes, a second without it before it changes back.
scoreboard players set @a[tag=muse_cam_target] muse_cam_t 0
execute as @a[tag=muse_cam_target] at @s unless block ~ ~2 ~ #muse_cam:open unless block ~ ~2 ~ #minecraft:leaves unless block ~1 ~1 ~ #muse_cam:open unless block ~-1 ~1 ~ #muse_cam:open unless block ~ ~1 ~1 #muse_cam:open unless block ~ ~1 ~-1 #muse_cam:open run scoreboard players set @s muse_cam_t 1
execute as @a[tag=muse_cam_target,scores={muse_cam_t=1}] run scoreboard players add @s muse_cam_enc 1
execute as @a[tag=muse_cam_target,scores={muse_cam_t=1}] run scoreboard players set @s muse_cam_open 0
execute as @a[tag=muse_cam_target,scores={muse_cam_t=0}] run scoreboard players add @s muse_cam_open 1
execute as @a[tag=muse_cam_target,scores={muse_cam_open=1..}] run scoreboard players set @s muse_cam_enc 0
execute as @a[tag=muse_cam_target,scores={muse_cam_enc=20..}] run tag @s add muse_cam_shut
execute as @a[tag=muse_cam_target,scores={muse_cam_open=20..}] run tag @s remove muse_cam_shut
scoreboard players set @a[scores={muse_cam_enc=100..}] muse_cam_enc 100
scoreboard players set @a[scores={muse_cam_open=100..}] muse_cam_open 100
