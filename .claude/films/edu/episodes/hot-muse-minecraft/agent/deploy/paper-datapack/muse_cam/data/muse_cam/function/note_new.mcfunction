# the evidence of the camera's spot, when the rule (#rl) or the eye's block changed since the last record: no line
# for a spot chosen again in the same place
execute store result score #ex muse_cam_y run data get entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos[0]
execute store result score #ey muse_cam_y run data get entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos[1]
execute store result score #ez muse_cam_y run data get entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos[2]
execute if score #rl muse_cam_y = #lr muse_cam_y if score #ex muse_cam_y = #lx muse_cam_y if score #ey muse_cam_y = #ly muse_cam_y if score #ez muse_cam_y = #lz muse_cam_y run return 0
scoreboard players operation #lr muse_cam_y = #rl muse_cam_y
scoreboard players operation #lx muse_cam_y = #ex muse_cam_y
scoreboard players operation #ly muse_cam_y = #ey muse_cam_y
scoreboard players operation #lz muse_cam_y = #ez muse_cam_y
function muse_cam:note
