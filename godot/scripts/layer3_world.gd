extends Node2D

const WORLD_STATE_PATH := "res://data/world_state.json"
const GENERATED_ASSETS_MANIFEST_PATH := "res://data/generated_assets_manifest.json"
const ASSET_PATHS := {
	"home-lv1": "res://assets/sprites/home-lv1.png",
	"home-lv2": "res://assets/sprites/home-lv2.png",
	"office-lv3": "res://assets/sprites/office-lv3.png",
	"memory-lv3": "res://assets/sprites/memory-lv3.png",
	"finance-lv2": "res://assets/sprites/finance-lv2.png",
	"life-lv2": "res://assets/sprites/life-lv2.png",
	"island-small": "res://assets/sprites/island-small.png",
	"island-medium": "res://assets/sprites/island-medium.png",
	"island-large": "res://assets/sprites/island-large.png",
	"island-lake": "res://assets/sprites/island-lake.png",
	"bridge-wood": "res://assets/sprites/bridge-wood.png",
	"bridge-stone": "res://assets/sprites/bridge-stone.png",
	"lighthouse": "res://assets/sprites/lighthouse.png",
	"reed-patch": "res://assets/sprites/reed-patch.png",
	"flower-bed": "res://assets/sprites/flower-bed.png",
	"dock-square": "res://assets/sprites/dock-square.png",
	"boat-sail": "res://assets/sprites/boat-sail.png",
	"tree-green": "res://assets/sprites/tree-green.png",
	"tree-palm": "res://assets/sprites/tree-palm.png",
	"bench": "res://assets/sprites/bench.png",
	"lamp-black": "res://assets/sprites/lamp-black.png",
	"signpost": "res://assets/sprites/signpost.png",
	"tile-water": "res://assets/sprites/tile-water.png",
	"player": "res://assets/sprites/char-male.png",
	"room-office": "res://assets/sprites/room-office.png",
	"room-memory": "res://assets/sprites/room-memory.png",
	"room-finance": "res://assets/sprites/room-finance.png",
	"room-life": "res://assets/sprites/room-life.png",
	"room-ai-lab": "res://assets/sprites/room-ai-lab.png"
}
const PLAYER_SPEED := 260.0

var state: Dictionary = {}
var generated_assets: Dictionary = {}
var world_layer: Node2D
var effect_layer: Node2D
var player: AnimatedSprite2D
var target_position := Vector2.ZERO
var room_panel: PanelContainer
var room_title: Label
var room_body: Label
var room_sprite: Sprite2D
var room_actions: VBoxContainer
var status_label: Label
var task_box: VBoxContainer
var current_room_node: Dictionary = {}
var completed_tasks: Array[String] = []


func _ready() -> void:
	state = _load_world_state()
	generated_assets = _load_generated_assets()
	_create_background()
	_create_world_layer()
	_create_camera()
	_create_world_from_state()
	_create_player()
	_create_overlay()


func _process(delta: float) -> void:
	if player == null:
		return
	var previous_position := player.position
	player.position = player.position.move_toward(target_position, PLAYER_SPEED * delta)
	player.z_index = int(player.position.y) + 1000
	var movement := player.position - previous_position
	if movement.length() > 0.2:
		if absf(movement.x) > 0.2:
			player.flip_h = movement.x < 0.0
		_play_player_animation("walk")
	else:
		_play_player_animation("idle")


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		target_position = get_global_mouse_position()


func _load_world_state() -> Dictionary:
	if not FileAccess.file_exists(WORLD_STATE_PATH):
		push_error("Missing Godot world state: %s" % WORLD_STATE_PATH)
		return {}

	var file := FileAccess.open(WORLD_STATE_PATH, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid Godot world_state.json")
		return {}
	return parsed


func _load_generated_assets() -> Dictionary:
	if not FileAccess.file_exists(GENERATED_ASSETS_MANIFEST_PATH):
		return {"assets": []}

	var file := FileAccess.open(GENERATED_ASSETS_MANIFEST_PATH, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("Invalid generated_assets_manifest.json")
		return {"assets": []}
	return parsed


func _create_background() -> void:
	var sky := ColorRect.new()
	sky.name = "SkyWaterBackdrop"
	sky.color = Color.html("#77d7f3")
	sky.position = Vector2(-720, -450)
	sky.size = Vector2(1440, 900)
	add_child(sky)

	for x in range(-720, 721, 128):
		for y in range(-256, 513, 96):
			var tile := _sprite("tile-water", Vector2(x, y), 0.9)
			tile.modulate = Color(0.75, 0.95, 1.0, 0.38)
			tile.z_index = -2000
			add_child(tile)


func _create_world_layer() -> void:
	world_layer = Node2D.new()
	world_layer.name = "GeneratedLayer3World"
	add_child(world_layer)

	effect_layer = Node2D.new()
	effect_layer.name = "Layer3Effects"
	add_child(effect_layer)


func _create_camera() -> void:
	var camera := Camera2D.new()
	camera.name = "WorldCamera"
	camera.position = Vector2(0, 60)
	camera.zoom = Vector2(0.82, 0.82)
	camera.enabled = true
	add_child(camera)


func _create_world_from_state() -> void:
	var nodes: Array = state.get("nodes", [])
	var last_position := Vector2.ZERO
	for index in range(nodes.size()):
		var node: Dictionary = nodes[index]
		var position_data: Dictionary = node.get("position", {})
		var position := Vector2(float(position_data.get("x", 0)), float(position_data.get("y", 0)))
		if index > 0:
			_add_bridge(last_position, position, index)
		_add_world_node(node, position)
		last_position = position

	_add_prop("lighthouse", Vector2(430, 320), 0.86, 1600)
	_add_prop("dock-square", Vector2(-470, 250), 0.78, 1300)
	_add_prop("boat-sail", Vector2(-530, 345), 0.84, 1400)
	_add_prop("signpost", Vector2(520, 210), 0.72, 1300)


func _add_world_node(node: Dictionary, position: Vector2) -> void:
	var visual: Dictionary = node.get("visual", {})
	var size_scale := clampf(float(visual.get("sizeScale", 1.0)) * 0.62, 0.72, 1.55)
	var brightness := clampf(float(visual.get("brightness", 0.8)), 0.35, 1.0)
	var vegetation := clampf(float(visual.get("vegetationDensity", 0.5)), 0.0, 1.0)
	var water_level := clampf(float(visual.get("waterLevel", 0.35)), 0.0, 1.0)
	var fog_density := clampf(float(visual.get("fogDensity", 0.0)), 0.0, 1.0)

	var island_key := "island-medium"
	if size_scale > 1.25:
		island_key = "island-large"
	elif water_level > 0.5:
		island_key = "island-lake"
	elif size_scale < 0.9:
		island_key = "island-small"

	var island := _sprite(island_key, position, size_scale)
	island.modulate = Color(brightness, brightness, brightness, 1.0)
	island.z_index = int(position.y)
	world_layer.add_child(island)
	_add_unlock_ring(position, size_scale, water_level, fog_density)

	var building_key := String(node.get("assetKey", "home-lv1"))
	var building := _sprite(building_key, position + Vector2(0, -58 * size_scale), size_scale * 0.72)
	building.modulate = Color(brightness, brightness, brightness, 1.0)
	building.z_index = int(position.y) + 10
	world_layer.add_child(building)
	_add_building_glow(position + Vector2(0, -46 * size_scale), brightness, int(position.y) + 8)

	var label := Label.new()
	label.text = "%s  Lv.%s" % [String(node.get("room", "节点")), str(int(visual.get("unlockLevel", 1)))]
	label.position = position + Vector2(-58, 68)
	label.z_index = int(position.y) + 80
	world_layer.add_child(label)

	var area := Area2D.new()
	area.name = "ClickArea_%s" % String(node.get("id", "node"))
	area.position = position
	area.z_index = int(position.y) + 90
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(210, 155) * size_scale
	shape.shape = rect
	area.add_child(shape)
	area.input_event.connect(_on_world_node_input.bind(node))
	world_layer.add_child(area)

	_add_environment_props(position, vegetation, fog_density, int(position.y))


func _add_bridge(from_position: Vector2, to_position: Vector2, index: int) -> void:
	var midpoint := (from_position + to_position) * 0.5
	var bridge := _sprite("bridge-wood" if index % 2 == 0 else "bridge-stone", midpoint, 0.72)
	bridge.rotation = (to_position - from_position).angle() * 0.22
	bridge.z_index = int(midpoint.y) - 20
	world_layer.add_child(bridge)


func _add_environment_props(position: Vector2, vegetation: float, fog_density: float, base_z: int) -> void:
	var prop_count := int(2 + vegetation * 5)
	var offsets := [
		Vector2(-112, 38),
		Vector2(108, 30),
		Vector2(-72, -18),
		Vector2(82, -24),
		Vector2(4, 82),
		Vector2(-138, -8),
		Vector2(134, -2)
	]
	for index in range(prop_count):
		var key := "flower-bed" if index % 3 == 0 else "tree-green"
		_add_prop(key, position + offsets[index % offsets.size()], 0.48 + vegetation * 0.18, base_z + 40 + index)

	if fog_density > 0.12:
		for index in range(int(1 + fog_density * 4)):
			_add_prop("reed-patch", position + Vector2(-130 + index * 58, 92), 0.42 + fog_density * 0.24, base_z + 70 + index)
		_add_fog_patch(position, fog_density, base_z + 95)


func _add_unlock_ring(position: Vector2, size_scale: float, water_level: float, fog_density: float) -> void:
	var ring := ColorRect.new()
	ring.name = "SemanticAura"
	var blue := clampf(0.12 + water_level * 0.25, 0.12, 0.36)
	var alpha := clampf(0.16 + fog_density * 0.22, 0.14, 0.42)
	ring.color = Color(0.44, 0.78, 1.0, alpha)
	ring.size = Vector2(250, 64) * size_scale
	ring.position = position - ring.size * 0.5 + Vector2(0, 34 * size_scale)
	ring.z_index = int(position.y) - 28
	world_layer.add_child(ring)
	var tween := create_tween().set_loops()
	tween.tween_property(ring, "modulate:a", alpha * 0.45, 1.6).set_trans(Tween.TRANS_SINE)
	tween.tween_property(ring, "modulate:a", alpha, 1.6).set_trans(Tween.TRANS_SINE)


func _add_building_glow(position: Vector2, brightness: float, z: int) -> void:
	if brightness < 0.64:
		return
	var glow := ColorRect.new()
	glow.name = "BuildingActiveGlow"
	glow.color = Color(1.0, 0.9, 0.48, 0.18)
	glow.size = Vector2(140, 38)
	glow.position = position - glow.size * 0.5 + Vector2(0, 46)
	glow.z_index = z
	world_layer.add_child(glow)
	var tween := create_tween().set_loops()
	tween.tween_property(glow, "modulate:a", 0.05, 1.1).set_trans(Tween.TRANS_SINE)
	tween.tween_property(glow, "modulate:a", 0.36, 1.1).set_trans(Tween.TRANS_SINE)


func _add_fog_patch(position: Vector2, fog_density: float, z: int) -> void:
	var fog := ColorRect.new()
	fog.name = "DampFatigueMist"
	fog.color = Color(0.86, 0.95, 1.0, clampf(fog_density * 0.42, 0.08, 0.28))
	fog.size = Vector2(260, 58)
	fog.position = position + Vector2(-130, 16)
	fog.z_index = z
	world_layer.add_child(fog)
	var tween := create_tween().set_loops()
	tween.tween_property(fog, "position:x", fog.position.x + 28, 2.4).set_trans(Tween.TRANS_SINE)
	tween.tween_property(fog, "position:x", fog.position.x, 2.4).set_trans(Tween.TRANS_SINE)


func _add_prop(asset_key: String, position: Vector2, scale_amount: float, z: int) -> void:
	var prop := _sprite(asset_key, position, scale_amount)
	prop.z_index = z
	world_layer.add_child(prop)


func _create_player() -> void:
	player = AnimatedSprite2D.new()
	player.name = "Player"
	player.sprite_frames = _create_player_frames()
	player.animation = "idle"
	player.play()
	player.position = Vector2(0, 380)
	player.scale = Vector2(0.95, 0.95) if _has_generated_player_walk() else Vector2(0.74, 0.74)
	player.z_index = 2000
	target_position = player.position
	world_layer.add_child(player)


func _create_overlay() -> void:
	var canvas := CanvasLayer.new()
	canvas.name = "Layer3Overlay"
	add_child(canvas)

	var ai_panel := PanelContainer.new()
	ai_panel.position = Vector2(24, 24)
	ai_panel.size = Vector2(360, 150)
	canvas.add_child(ai_panel)

	var ai_box := VBoxContainer.new()
	ai_box.add_theme_constant_override("separation", 8)
	ai_panel.add_child(ai_box)
	_add_overlay_label(ai_box, "Hermes Agent", true)
	var ai: Dictionary = state.get("ai", {})
	_add_overlay_label(ai_box, "结论  " + String(ai.get("conclusion", "")), false)
	_add_overlay_label(ai_box, "建议  " + String(ai.get("suggestion", "")), false)
	_add_overlay_label(ai_box, "风险  " + String(ai.get("risk", "")), false)
	status_label = _add_overlay_label(ai_box, "状态  点击建筑进入房间", false)

	var task_panel := PanelContainer.new()
	task_panel.position = Vector2(1030, 24)
	task_panel.size = Vector2(360, 160)
	canvas.add_child(task_panel)

	task_box = VBoxContainer.new()
	task_box.add_theme_constant_override("separation", 8)
	task_panel.add_child(task_box)
	_render_tasks()

	room_panel = PanelContainer.new()
	room_panel.position = Vector2(920, 520)
	room_panel.size = Vector2(430, 300)
	room_panel.visible = false
	canvas.add_child(room_panel)

	var room_box := VBoxContainer.new()
	room_box.add_theme_constant_override("separation", 8)
	room_panel.add_child(room_box)
	room_title = Label.new()
	room_title.add_theme_font_size_override("font_size", 22)
	room_box.add_child(room_title)
	room_body = Label.new()
	room_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	room_box.add_child(room_body)
	room_actions = VBoxContainer.new()
	room_actions.add_theme_constant_override("separation", 6)
	room_box.add_child(room_actions)

	room_sprite = Sprite2D.new()
	room_sprite.position = Vector2(1120, 410)
	room_sprite.scale = Vector2(0.34, 0.34)
	room_sprite.visible = false
	room_sprite.z_index = 3000
	add_child(room_sprite)


func _add_overlay_label(parent: VBoxContainer, text: String, heading: bool) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if heading:
		label.add_theme_font_size_override("font_size", 22)
	parent.add_child(label)
	return label


func _render_tasks() -> void:
	for child in task_box.get_children():
		child.queue_free()
	_add_overlay_label(task_box, "今日任务", true)
	var tasks: Array = state.get("tasks", [])
	for index in range(min(tasks.size(), 4)):
		var task := String(tasks[index])
		var button := Button.new()
		button.text = ("✓ " if completed_tasks.has(task) else "□ ") + task
		button.disabled = completed_tasks.has(task)
		button.pressed.connect(_complete_task.bind(task))
		task_box.add_child(button)


func _on_world_node_input(_viewport: Node, event: InputEvent, _shape_idx: int, node: Dictionary) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var position_data: Dictionary = node.get("position", {})
		target_position = Vector2(float(position_data.get("x", 0)), float(position_data.get("y", 0))) + Vector2(0, 115)
		current_room_node = node
		_show_room(node)
		_set_status("前往 " + String(node.get("name", "地点")) + "，进入 " + String(node.get("room", "房间")))
		get_viewport().set_input_as_handled()


func _show_room(node: Dictionary) -> void:
	var room := String(node.get("room", "节点"))
	var unlocks: Array = node.get("unlocks", [])
	var rooms: Array = node.get("rooms", [])
	room_panel.visible = true
	room_title.text = "%s · %s" % [String(node.get("name", "")), room]
	room_body.text = "由 Layer 1 生成：%s\n已解锁：%s\n房间：%s\n点击世界任意位置移动角色。" % [
		String(node.get("role", "unknown")),
		", ".join(unlocks),
		", ".join(rooms)
	]
	_render_room_actions(node)

	var room_key := "room-life"
	if room == "办公室":
		room_key = "room-office"
	elif room == "记忆馆":
		room_key = "room-memory"
	elif room == "财务楼":
		room_key = "room-finance"
	room_sprite.texture = _texture(room_key)
	room_sprite.visible = true


func _render_room_actions(node: Dictionary) -> void:
	for child in room_actions.get_children():
		child.queue_free()
	_add_room_button("查看事件列表", _show_events.bind(node))
	_add_room_button("时间轴回放", _show_timeline.bind(node))
	_add_room_button("询问 AI 建议", _show_ai_advice.bind(node))
	_add_room_button("完成今日任务", _complete_current_room_task.bind(node))
	_add_room_button("关闭房间", _close_room)


func _add_room_button(text: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = text
	button.pressed.connect(callback)
	room_actions.add_child(button)


func _show_events(node: Dictionary) -> void:
	var unlocks: Array = node.get("unlocks", [])
	room_body.text = "事件列表\n- 最近访问：" + String(node.get("name", "")) + "\n- 解锁：" + ", ".join(unlocks) + "\n- Layer 1 已生成 PlaceProfile。"
	_set_status("打开 " + String(node.get("name", "")) + " 的事件列表")


func _show_timeline(_node: Dictionary) -> void:
	var lines: Array[String] = []
	var timeline: Array = state.get("timeline", [])
	for item in timeline:
		if typeof(item) == TYPE_DICTIONARY:
			lines.append("%s  %s  %s" % [String(item.get("year", "")), String(item.get("title", "")), String(item.get("note", ""))])
	room_body.text = "时间轴回放\n" + "\n".join(lines)
	_set_status("时间轴驱动世界状态回放")


func _show_ai_advice(node: Dictionary) -> void:
	var ai: Dictionary = state.get("ai", {})
	room_body.text = "AI 建议\n结论：" + String(ai.get("conclusion", "")) + "\n建议：" + String(ai.get("suggestion", "")) + "\n风险：" + String(ai.get("risk", "")) + "\n关联地点：" + String(node.get("name", ""))
	_set_status("Hermes Agent 基于 PlaceProfile 给出建议")


func _complete_current_room_task(node: Dictionary) -> void:
	var tasks: Array = state.get("tasks", [])
	if tasks.is_empty():
		_set_status("当前没有待完成任务")
		return
	_complete_task(String(tasks[0]))
	_spawn_reward_burst(player.position + Vector2(0, -72))
	room_body.text = "任务完成\n" + String(node.get("name", "")) + " 已收到一次正反馈。\nLayer 1 下一轮会更新 Event 与 PlaceProfile。"


func _complete_task(task: String) -> void:
	if not completed_tasks.has(task):
		completed_tasks.append(task)
	_render_tasks()
	_set_status("任务完成：" + task)
	_spawn_reward_burst(player.position + Vector2(0, -72))


func _close_room() -> void:
	room_panel.visible = false
	room_sprite.visible = false
	_set_status("回到世界探索")


func _sprite(asset_key: String, position: Vector2, scale_amount: float) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = _texture(asset_key)
	sprite.position = position
	sprite.scale = Vector2(scale_amount, scale_amount)
	return sprite


func _create_player_frames() -> SpriteFrames:
	var frames := SpriteFrames.new()
	frames.add_animation("idle")
	frames.set_animation_loop("idle", true)
	frames.set_animation_speed("idle", 6.0)
	frames.add_frame("idle", _texture("player"))

	frames.add_animation("walk")
	frames.set_animation_loop("walk", true)
	frames.set_animation_speed("walk", 12.0)
	var generated := _generated_animation_entry("walk")
	if generated.is_empty():
		frames.add_frame("walk", _texture("player"))
		return frames

	var texture: Texture2D = load(String(generated.get("sheet", "")))
	var frame_count := int(generated.get("frame_count", 1))
	var frame_size := int(generated.get("frame_size", 256))
	for index in range(frame_count):
		var atlas := AtlasTexture.new()
		atlas.atlas = texture
		atlas.region = Rect2(index * frame_size, 0, frame_size, frame_size)
		frames.add_frame("walk", atlas)
	frames.set_animation_speed("walk", float(generated.get("fps", 12)))
	return frames


func _generated_animation_entry(animation_name: String) -> Dictionary:
	var assets: Array = generated_assets.get("assets", [])
	for item in assets:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("kind", "")) == "character_animation" and String(item.get("animation", "")) == animation_name:
			var path := String(item.get("sheet", ""))
			if not path.is_empty() and ResourceLoader.exists(path):
				return item
	return {}


func _has_generated_player_walk() -> bool:
	return not _generated_animation_entry("walk").is_empty()


func _play_player_animation(animation_name: String) -> void:
	if player.animation == animation_name and player.is_playing():
		return
	if player.sprite_frames != null and player.sprite_frames.has_animation(animation_name):
		player.play(animation_name)


func _spawn_reward_burst(position: Vector2) -> void:
	for index in range(8):
		var dot := ColorRect.new()
		dot.color = Color(1.0, 0.78, 0.22, 0.85)
		dot.size = Vector2(8, 8)
		dot.position = position
		dot.z_index = 5000
		effect_layer.add_child(dot)
		var angle := TAU * float(index) / 8.0
		var target := position + Vector2(cos(angle), sin(angle)) * 56.0
		var tween := create_tween()
		tween.tween_property(dot, "position", target, 0.42).set_trans(Tween.TRANS_SINE)
		tween.parallel().tween_property(dot, "modulate:a", 0.0, 0.42)
		tween.tween_callback(dot.queue_free)


func _set_status(text: String) -> void:
	if status_label != null:
		status_label.text = "状态  " + text


func _texture(asset_key: String) -> Texture2D:
	var path := String(ASSET_PATHS.get(asset_key, ""))
	if path.is_empty():
		push_warning("Unknown Layer 3 asset: %s" % asset_key)
		return null
	return load(path)
