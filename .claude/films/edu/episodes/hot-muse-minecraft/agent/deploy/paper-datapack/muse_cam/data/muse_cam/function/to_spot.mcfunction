# the eye to the spot muse_cam:good kept, turned to the bot's eyes
execute at @e[type=minecraft:marker,tag=muse_cam_spot,limit=1] run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing entity @a[tag=muse_cam_target,limit=1] eyes
