extends Node2D

const WORLD_STATE_PATH := "res://data/world_state.json"
const GENERATED_ASSETS_MANIFEST_PATH := "res://data/generated_assets_manifest.json"
const FRONTEND_PACK_PATH := "res://data/hangzhou_pack.json"
const FRONTEND_MAP_SIZE := Vector2(1672.0, 941.0)
const MEMORY_ROOM_MAP_PATH := "res://assets/generated/v2/memory-room-map.json"
const MEMORY_ROOM_DEFAULT_SIZE := Vector2(1672.0, 941.0)
const UI_FONT_PATHS := [
	"res://assets/fonts/SourceHanSansCN-Regular.otf"
]
const COLOR_BG_CARD := Color(1.0, 1.0, 1.0, 0.9)
const COLOR_BG_SOFT := Color(0.956862745, 0.968627451, 0.984313725, 1.0)
const COLOR_PRIMARY_STRONG := Color(0.11372549, 0.435294118, 0.819607843, 1.0)
const COLOR_PRIMARY_HOVER := Color(0.184313725, 0.517647059, 0.917647059, 1.0)
const COLOR_TEXT_MAIN := Color(0.066666667, 0.094117647, 0.152941176, 1.0)
const COLOR_TEXT_SUB := Color(0.278431373, 0.333333333, 0.411764706, 1.0)
const COLOR_TEXT_MUTED := Color(0.580392157, 0.639215686, 0.721568627, 1.0)
const COLOR_BORDER := Color(0.88627451, 0.909803922, 0.941176471, 1.0)
const COLOR_PLAYER_LEG := Color(0.035294118, 0.149019608, 0.349019608, 0.92)
const COLOR_PLAYER_SHOE := Color(0.921568627, 0.964705882, 1.0, 0.94)
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
	"player": "res://assets/generated/v2/hangzhou-sprites/avatar-male.png",
	"room-office": "res://assets/sprites/room-office.png",
	"room-memory": "res://assets/sprites/room-memory.png",
	"room-finance": "res://assets/sprites/room-finance.png",
	"room-life": "res://assets/sprites/room-life.png",
	"room-ai-lab": "res://assets/sprites/room-ai-lab.png"
}
const PLAYER_SPEED := 260.0
const MEMORY_DOOR_TRIGGER_DISTANCE := 84.0

var state: Dictionary = {}
var generated_assets: Dictionary = {}
var frontend_pack: Dictionary = {}
var frontend_map_scale := 1.0
var frontend_map_top_left := Vector2.ZERO
var ui_font: Font
var world_state_path := WORLD_STATE_PATH
var session_output_path := ""
var session_world_slug := "hangzhou"
var requested_room := "world"
var session_written := false
var web_session_sent := false
var memory_room_map: Dictionary = {}
var memory_room_size := MEMORY_ROOM_DEFAULT_SIZE
var memory_room_scale := 1.0
var memory_room_top_left := Vector2.ZERO
var world_layer: Node2D
var effect_layer: Node2D
var player: AnimatedSprite2D
var player_walk_pose: Node2D
var target_position := Vector2.ZERO
var room_panel: PanelContainer
var room_title: Label
var room_body: Label
var room_sprite: Sprite2D
var room_actions: VBoxContainer
var status_label: Label
var task_box: VBoxContainer
var current_room_node: Dictionary = {}
var active_memory_door_node: Dictionary = {}
var memory_door_prompt: Label
var movement_locked := false
var door_transitioning := false
var completed_tasks: Array[String] = []
var visited_rooms: Array[String] = []


func _ready() -> void:
	_configure_session_from_args()
	state = _load_world_state()
	generated_assets = _load_generated_assets()
	_configure_ui_font()
	if _is_memory_room_mode():
		if session_world_slug == "hangzhou":
			session_world_slug = "memory-room"
		memory_room_map = _load_memory_room_map()
		_configure_memory_room_layout()
		_create_memory_room_background()
		_create_world_layer()
		_create_camera()
		_create_memory_room_from_map()
		_create_player()
		_create_overlay()
		_set_status("记忆室可探索 · WASD 移动，点击物件交互")
		return

	frontend_pack = _load_frontend_pack()
	_configure_frontend_map_layout()
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
	if movement_locked:
		target_position = player.position
	else:
		var keyboard_movement := _keyboard_movement_vector()
		if keyboard_movement != Vector2.ZERO:
			player.position += keyboard_movement * PLAYER_SPEED * delta
			target_position = player.position
		else:
			player.position = player.position.move_toward(target_position, PLAYER_SPEED * delta)
	player.z_index = int(player.position.y) + 1000
	var movement := player.position - previous_position
	var player_is_walking := false
	if movement_locked:
		_play_player_animation("idle")
	elif movement.length() > 0.2:
		if absf(movement.x) > 0.2:
			player.flip_h = movement.x < 0.0
		_play_player_animation("walk")
		player_is_walking = true
	else:
		_play_player_animation("idle")
	_update_player_walk_pose(player_is_walking, movement)
	_sync_memory_door_trigger()


func _unhandled_input(event: InputEvent) -> void:
	if movement_locked:
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_handle_world_click_at(get_global_mouse_position())
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.keycode == KEY_ESCAPE and event.pressed:
		_request_return_to_app()
	elif event is InputEventKey and _movement_vector_from_key(event.keycode) != Vector2.ZERO:
		get_viewport().set_input_as_handled()


func _exit_tree() -> void:
	_write_session_result("completed")


func _configure_session_from_args() -> void:
	_apply_session_args(OS.get_cmdline_user_args())
	_apply_session_args(OS.get_cmdline_args())
	if OS.has_feature("web"):
		var search_value = JavaScriptBridge.eval("window.location.search", true)
		if typeof(search_value) == TYPE_STRING:
			_apply_room_search_params(String(search_value))


func _apply_session_args(args) -> void:
	var index := 0
	while index < args.size():
		var key := String(args[index])
		if key == "--world-state" and index + 1 < args.size():
			world_state_path = String(args[index + 1])
			index += 2
		elif key == "--session-output" and index + 1 < args.size():
			session_output_path = String(args[index + 1])
			index += 2
		elif key == "--world-slug" and index + 1 < args.size():
			session_world_slug = String(args[index + 1])
			index += 2
		elif key == "--room" and index + 1 < args.size():
			_set_requested_room(String(args[index + 1]))
			index += 2
		else:
			index += 1


func _apply_room_search_params(search: String) -> void:
	var query := search
	if query.begins_with("?"):
		query = query.substr(1)
	for pair in query.split("&", false):
		var separator := pair.find("=")
		var key := pair if separator == -1 else pair.substr(0, separator)
		var value := "" if separator == -1 else pair.substr(separator + 1)
		if key == "room":
			_set_requested_room(value.uri_decode())


func _set_requested_room(room: String) -> void:
	requested_room = room
	if requested_room == "memory" and session_world_slug == "hangzhou":
		session_world_slug = "memory-room"


func _is_memory_room_mode() -> bool:
	return requested_room == "memory"


func _load_world_state() -> Dictionary:
	if not FileAccess.file_exists(world_state_path):
		push_error("Missing Godot world state: %s" % world_state_path)
		return {}

	var file := FileAccess.open(world_state_path, FileAccess.READ)
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


func _load_frontend_pack() -> Dictionary:
	if not FileAccess.file_exists(FRONTEND_PACK_PATH):
		return {}

	var file := FileAccess.open(FRONTEND_PACK_PATH, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("Invalid hangzhou_pack.json")
		return {}
	return parsed


func _load_memory_room_map() -> Dictionary:
	if not FileAccess.file_exists(MEMORY_ROOM_MAP_PATH):
		push_error("Missing memory-room map: %s" % MEMORY_ROOM_MAP_PATH)
		return {}

	var file := FileAccess.open(MEMORY_ROOM_MAP_PATH, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid memory-room map JSON")
		return {}
	return parsed


func _configure_frontend_map_layout() -> void:
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = Vector2(1440.0, 900.0)
	frontend_map_scale = maxf(viewport_size.x / FRONTEND_MAP_SIZE.x, viewport_size.y / FRONTEND_MAP_SIZE.y)
	frontend_map_top_left = -FRONTEND_MAP_SIZE * frontend_map_scale * 0.5


func _configure_memory_room_layout() -> void:
	var size_data: Dictionary = memory_room_map.get("size", {})
	memory_room_size = Vector2(
		float(size_data.get("width", MEMORY_ROOM_DEFAULT_SIZE.x)),
		float(size_data.get("height", MEMORY_ROOM_DEFAULT_SIZE.y))
	)
	if memory_room_size.x <= 0.0 or memory_room_size.y <= 0.0:
		memory_room_size = MEMORY_ROOM_DEFAULT_SIZE

	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = Vector2(1440.0, 900.0)
	memory_room_scale = maxf(viewport_size.x / memory_room_size.x, viewport_size.y / memory_room_size.y)
	memory_room_top_left = -memory_room_size * memory_room_scale * 0.5


func _has_frontend_pack() -> bool:
	if _is_memory_room_mode():
		return false
	return not frontend_pack.is_empty()


func _create_background() -> void:
	if _has_frontend_pack():
		var background_path := _public_asset_to_res_path(String(frontend_pack.get("background", "")))
		var background_texture: Texture2D = load(background_path)
		if background_texture != null:
			var background := Sprite2D.new()
			background.name = "HangzhouFrontendBackground"
			background.texture = background_texture
			background.position = Vector2.ZERO
			background.scale = Vector2(frontend_map_scale, frontend_map_scale)
			background.z_index = -3000
			add_child(background)
			return

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


func _create_memory_room_background() -> void:
	var base_data: Dictionary = memory_room_map.get("base", {})
	var background_texture := _load_memory_room_texture(String(base_data.get("src", "")))
	if background_texture != null:
		var background := Sprite2D.new()
		background.name = "MemoryRoomBackground"
		background.texture = background_texture
		background.position = Vector2.ZERO
		background.scale = Vector2(memory_room_scale, memory_room_scale)
		background.z_index = -3000
		add_child(background)
		return

	var fallback := ColorRect.new()
	fallback.name = "MemoryRoomFallbackBackdrop"
	fallback.color = Color.html("#e9dfcf")
	fallback.position = memory_room_top_left
	fallback.size = memory_room_size * memory_room_scale
	fallback.z_index = -3000
	add_child(fallback)


func _create_world_layer() -> void:
	world_layer = Node2D.new()
	world_layer.name = "MemoryRoomLayer" if _is_memory_room_mode() else "GeneratedLayer3World"
	add_child(world_layer)

	effect_layer = Node2D.new()
	effect_layer.name = "Layer3Effects"
	add_child(effect_layer)


func _create_camera() -> void:
	var camera := Camera2D.new()
	camera.name = "WorldCamera"
	camera.position = Vector2.ZERO if _has_frontend_pack() or _is_memory_room_mode() else Vector2(0, 60)
	camera.zoom = Vector2.ONE if _has_frontend_pack() or _is_memory_room_mode() else Vector2(0.82, 0.82)
	camera.enabled = true
	add_child(camera)


func _create_world_from_state() -> void:
	if _has_frontend_pack():
		_create_frontend_world_from_pack()
		return

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


func _create_frontend_world_from_pack() -> void:
	var layers: Array = frontend_pack.get("layers", [])
	layers.sort_custom(_sort_frontend_layers)
	for layer_value in layers:
		if typeof(layer_value) != TYPE_DICTIONARY:
			continue
		var layer: Dictionary = layer_value
		if String(layer.get("key", "")) == "player":
			continue
		_add_frontend_layer(layer)


func _create_memory_room_from_map() -> void:
	var layers: Array = memory_room_map.get("layers", [])
	layers.sort_custom(_sort_memory_room_layers)
	for layer_value in layers:
		if typeof(layer_value) != TYPE_DICTIONARY:
			continue
		var layer: Dictionary = layer_value
		if String(layer.get("type", "")) == "base" or String(layer.get("key", "")) == "background":
			continue
		_add_memory_room_layer(layer)


func _sort_frontend_layers(a: Dictionary, b: Dictionary) -> bool:
	var a_position: Dictionary = a.get("position", {})
	var b_position: Dictionary = b.get("position", {})
	return int(a_position.get("zIndex", 0)) < int(b_position.get("zIndex", 0))


func _sort_memory_room_layers(a: Dictionary, b: Dictionary) -> bool:
	return int(a.get("zIndex", 0)) < int(b.get("zIndex", 0))


func _add_frontend_layer(layer: Dictionary) -> void:
	var position_data: Dictionary = layer.get("position", {})
	var texture: Texture2D = load(_public_asset_to_res_path(String(layer.get("sprite", ""))))
	if texture == null:
		push_warning("Missing frontend layer sprite: %s" % String(layer.get("sprite", "")))
		return

	var rect := _frontend_rect(position_data)
	var sprite := Sprite2D.new()
	sprite.name = "FrontendLayer_%s" % String(layer.get("key", "sprite"))
	sprite.texture = texture
	sprite.position = rect.position + rect.size * 0.5
	sprite.scale = Vector2.ONE * minf(rect.size.x / float(texture.get_width()), rect.size.y / float(texture.get_height()))
	sprite.z_index = int(position_data.get("zIndex", 0)) * 10
	if position_data.has("rotate"):
		sprite.rotation_degrees = float(String(position_data.get("rotate", "0")).replace("deg", ""))
	world_layer.add_child(sprite)

	if String(layer.get("kind", "")) == "spot":
		_add_frontend_click_area(layer, rect)


func _add_memory_room_layer(layer: Dictionary) -> void:
	var texture := _load_memory_room_texture(String(layer.get("src", "")))
	if texture == null:
		push_warning("Missing memory-room sprite: %s" % String(layer.get("src", "")))
		return

	var rect := _memory_room_rect(layer)
	var sprite := Sprite2D.new()
	sprite.name = "MemoryRoomProp_%s" % String(layer.get("key", "prop"))
	sprite.texture = texture
	sprite.position = rect.position + rect.size * 0.5
	sprite.scale = Vector2.ONE * minf(rect.size.x / float(texture.get_width()), rect.size.y / float(texture.get_height()))
	sprite.z_index = int(layer.get("zIndex", 0)) * 10
	world_layer.add_child(sprite)

	var area := Area2D.new()
	area.name = "MemoryRoomClickArea_%s" % String(layer.get("key", "prop"))
	area.position = rect.position + rect.size * 0.5
	area.z_index = sprite.z_index + 2
	var shape := CollisionShape2D.new()
	var area_shape := RectangleShape2D.new()
	area_shape.size = rect.size
	shape.shape = area_shape
	area.add_child(shape)
	area.input_event.connect(_on_memory_room_object_input.bind(layer))
	world_layer.add_child(area)

	var label := Label.new()
	label.name = "MemoryRoomLabel_%s" % String(layer.get("key", "prop"))
	label.text = String(layer.get("label", "记忆物件"))
	label.position = rect.position + Vector2(8, maxf(8.0, rect.size.y - 34.0))
	label.z_index = sprite.z_index + 4
	_apply_ui_text(label)
	label.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	world_layer.add_child(label)


func _add_frontend_click_area(layer: Dictionary, rect: Rect2) -> void:
	var area := Area2D.new()
	area.name = "FrontendClickArea_%s" % String(layer.get("key", "spot"))
	area.position = rect.position + rect.size * 0.5
	area.z_index = 1200
	var shape := CollisionShape2D.new()
	var area_shape := RectangleShape2D.new()
	area_shape.size = rect.size
	shape.shape = area_shape
	area.add_child(shape)
	area.input_event.connect(_on_world_node_input.bind(_state_node_for_frontend_layer(layer)))
	world_layer.add_child(area)


func _state_node_for_frontend_layer(layer: Dictionary) -> Dictionary:
	var role_by_key := {
		"office": "work",
		"memory": "memory",
		"finance": "finance",
		"life": "life",
		"home": "home"
	}
	var layer_key := String(layer.get("key", ""))
	var wanted_role := String(role_by_key.get(layer_key, ""))
	var nodes: Array = state.get("nodes", [])
	for node_value in nodes:
		if typeof(node_value) == TYPE_DICTIONARY:
			var node: Dictionary = node_value
			if String(node.get("role", "")) == wanted_role:
				return _with_frontend_walk_target(node, layer)

	var fallback_room := String(layer.get("label", layer_key))
	return _with_frontend_walk_target({
		"id": "frontend-%s" % layer_key,
		"name": fallback_room,
		"room": fallback_room,
		"visual": {
			"unlockLevel": 1
		},
		"unlocks": [],
		"rooms": [fallback_room]
	}, layer)


func _with_frontend_walk_target(node: Dictionary, layer: Dictionary) -> Dictionary:
	var node_with_target := node.duplicate(true)
	var walk_target := _walk_target_for_frontend_layer(layer)
	node_with_target["walkTarget"] = {
		"x": walk_target.x,
		"y": walk_target.y
	}
	return node_with_target


func _walk_target_for_frontend_layer(layer: Dictionary) -> Vector2:
	var rect := _frontend_rect(layer.get("position", {}))
	return rect.position + Vector2(rect.size.x * 0.5, rect.size.y * 0.78)


func _walk_target_for_node(node: Dictionary) -> Vector2:
	if node.has("walkTarget"):
		var walk_target: Dictionary = node.get("walkTarget", {})
		return Vector2(float(walk_target.get("x", 0)), float(walk_target.get("y", 0)))

	var position_data: Dictionary = node.get("position", {})
	return Vector2(float(position_data.get("x", 0)), float(position_data.get("y", 0))) + Vector2(0, 115)


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
	_apply_ui_text(label)
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


func _attach_player_walk_pose() -> void:
	if player == null:
		return
	var existing := player.get_node_or_null("WalkPose")
	if existing != null:
		existing.queue_free()

	player_walk_pose = Node2D.new()
	player_walk_pose.name = "WalkPose"
	player_walk_pose.visible = false
	player_walk_pose.z_index = 8
	player.add_child(player_walk_pose)
	player_walk_pose.add_child(_create_walk_leg_node("LeftLeg", Vector2(-8, 28)))
	player_walk_pose.add_child(_create_walk_leg_node("RightLeg", Vector2(8, 28)))


func _create_walk_leg_node(node_name: String, hip_position: Vector2) -> Node2D:
	var leg := Node2D.new()
	leg.name = node_name
	leg.position = hip_position

	var thigh := Polygon2D.new()
	thigh.name = "Pants"
	thigh.color = COLOR_PLAYER_LEG
	thigh.polygon = PackedVector2Array([
		Vector2(-3, 0),
		Vector2(4, 0),
		Vector2(5, 25),
		Vector2(-4, 25),
	])
	leg.add_child(thigh)

	var shoe := Polygon2D.new()
	shoe.name = "Shoe"
	shoe.color = COLOR_PLAYER_SHOE
	shoe.position = Vector2(0, 25)
	shoe.polygon = PackedVector2Array([
		Vector2(-8, 0),
		Vector2(7, 0),
		Vector2(9, 5),
		Vector2(-9, 5),
	])
	leg.add_child(shoe)
	return leg


func _update_player_walk_pose(is_walking: bool, _movement: Vector2) -> void:
	if player_walk_pose == null and player != null:
		player_walk_pose = player.get_node_or_null("WalkPose") as Node2D
	if player_walk_pose == null:
		return

	var left_leg := player_walk_pose.get_node_or_null("LeftLeg") as Node2D
	var right_leg := player_walk_pose.get_node_or_null("RightLeg") as Node2D
	if left_leg == null or right_leg == null:
		return

	player_walk_pose.visible = is_walking
	if not is_walking or player == null:
		left_leg.position = Vector2(-8, 28)
		right_leg.position = Vector2(8, 28)
		left_leg.rotation = 0.0
		right_leg.rotation = 0.0
		left_leg.scale = Vector2.ONE
		right_leg.scale = Vector2.ONE
		return

	var frame_count := 12
	if player.sprite_frames != null and player.sprite_frames.has_animation("walk"):
		frame_count = max(1, player.sprite_frames.get_frame_count("walk"))
	var phase := TAU * float(player.frame % frame_count) / float(frame_count)
	var stride := sin(phase)
	if absf(stride) < 0.08:
		stride = 0.08 if cos(phase) >= 0.0 else -0.08

	left_leg.position = Vector2(-8 + stride * 3.0, 28 + maxf(0.0, -stride) * 2.0)
	right_leg.position = Vector2(8 - stride * 3.0, 28 + maxf(0.0, stride) * 2.0)
	left_leg.rotation = stride * 0.24
	right_leg.rotation = -stride * 0.24
	left_leg.scale = Vector2(1.0, 0.96 + maxf(0.0, stride) * 0.12)
	right_leg.scale = Vector2(1.0, 0.96 + maxf(0.0, -stride) * 0.12)


func _create_player() -> void:
	player = AnimatedSprite2D.new()
	player.name = "Player"
	player.sprite_frames = _create_player_frames()
	player.animation = "idle"
	player.play()
	if _is_memory_room_mode():
		var player_texture := _texture("player")
		player.position = memory_room_top_left + Vector2(memory_room_size.x * 0.50, memory_room_size.y * 0.82) * memory_room_scale
		if player_texture != null:
			player.scale = Vector2.ONE * (72.0 * memory_room_scale / float(player_texture.get_height()))
		else:
			player.scale = Vector2(0.5, 0.5)
		player.z_index = int(player.position.y) + 1000
		target_position = player.position
		_attach_player_walk_pose()
		world_layer.add_child(player)
		return

	var frontend_player := _frontend_layer_by_key("player")
	if not frontend_player.is_empty():
		var player_rect := _frontend_rect(frontend_player.get("position", {}))
		var player_texture := _texture("player")
		player.position = player_rect.position + player_rect.size * 0.5
		if player_texture != null:
			player.scale = Vector2.ONE * minf(player_rect.size.x / float(player_texture.get_width()), player_rect.size.y / float(player_texture.get_height()))
		else:
			player.scale = Vector2(0.74, 0.74)
		player.z_index = 700
	else:
		player.position = Vector2(0, 380)
		player.scale = Vector2(0.95, 0.95) if _has_generated_player_walk() else Vector2(0.74, 0.74)
		player.z_index = 2000
	target_position = player.position
	_attach_player_walk_pose()
	world_layer.add_child(player)


func _create_overlay() -> void:
	var canvas := CanvasLayer.new()
	canvas.name = "Layer3Overlay"
	add_child(canvas)

	var ai_panel := PanelContainer.new()
	ai_panel.name = "AiInsightPanel"
	ai_panel.position = Vector2(24, 92)
	ai_panel.size = Vector2(360, 170)
	_apply_panel_style(ai_panel)
	canvas.add_child(ai_panel)

	var ai_box := VBoxContainer.new()
	ai_box.add_theme_constant_override("separation", 8)
	ai_panel.add_child(ai_box)
	if _is_memory_room_mode():
		_add_overlay_label(ai_box, "记忆室助手", true)
		_add_overlay_label(ai_box, "整理  照片、音频、笔记、书和地点已接入", false)
		_add_overlay_label(ai_box, "工具  打开列表 · 播放语音 · 触发总结", false)
		_add_overlay_label(ai_box, "提示  WASD 移动，点击物件交互", false)
		status_label = _add_overlay_label(ai_box, "状态  点击书架、地图墙、相册、音频机或时间台", false)
	else:
		_add_overlay_label(ai_box, "AI 建议", true)
		var ai: Dictionary = state.get("ai", {})
		_add_overlay_label(ai_box, "结论  " + _user_facing_copy(String(ai.get("conclusion", ""))), false)
		_add_overlay_label(ai_box, "建议  " + _user_facing_copy(String(ai.get("suggestion", ""))), false)
		_add_overlay_label(ai_box, "风险  " + _user_facing_copy(String(ai.get("risk", ""))), false)
		status_label = _add_overlay_label(ai_box, "状态  点击建筑进入房间", false)
	var return_button := Button.new()
	return_button.text = "返回 Memory Map"
	_apply_ui_text(return_button)
	_apply_button_style(return_button, false)
	return_button.pressed.connect(_request_return_to_app)
	ai_box.add_child(return_button)

	var task_panel := PanelContainer.new()
	task_panel.name = "TaskPanel"
	task_panel.position = Vector2(1030, 92)
	task_panel.size = Vector2(360, 160)
	_apply_panel_style(task_panel)
	canvas.add_child(task_panel)

	task_box = VBoxContainer.new()
	task_box.add_theme_constant_override("separation", 8)
	task_panel.add_child(task_box)
	_render_tasks()

	room_panel = PanelContainer.new()
	room_panel.name = "RoomPanel"
	room_panel.position = Vector2(920, 520)
	room_panel.size = Vector2(430, 300)
	room_panel.visible = false
	_apply_panel_style(room_panel)
	canvas.add_child(room_panel)

	var room_box := VBoxContainer.new()
	room_box.add_theme_constant_override("separation", 8)
	room_panel.add_child(room_box)
	room_title = Label.new()
	_apply_ui_text(room_title, 22)
	room_box.add_child(room_title)
	room_body = Label.new()
	room_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_apply_ui_text(room_body)
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

	memory_door_prompt = Label.new()
	memory_door_prompt.name = "MemoryDoorPrompt"
	memory_door_prompt.text = "正在进入记忆室"
	memory_door_prompt.position = Vector2(568, 760)
	memory_door_prompt.visible = false
	memory_door_prompt.z_index = 3800
	_apply_ui_text(memory_door_prompt, 24)
	memory_door_prompt.add_theme_color_override("font_color", Color.WHITE)
	memory_door_prompt.add_theme_color_override("font_outline_color", Color(0.02, 0.03, 0.06, 0.9))
	memory_door_prompt.add_theme_constant_override("outline_size", 8)
	canvas.add_child(memory_door_prompt)


func _add_overlay_label(parent: VBoxContainer, text: String, heading: bool) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_apply_ui_text(label, 22 if heading else 0)
	label.add_theme_color_override("font_color", COLOR_TEXT_MAIN if heading else COLOR_TEXT_SUB)
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
		_apply_ui_text(button)
		_apply_button_style(button, completed_tasks.has(task))
		button.pressed.connect(_complete_task.bind(task))
		task_box.add_child(button)


func _on_world_node_input(_viewport: Node, event: InputEvent, _shape_idx: int, node: Dictionary) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_focus_world_node(node)
		get_viewport().set_input_as_handled()


func _handle_world_click_at(world_position: Vector2) -> bool:
	var node := _frontend_node_at_world_position(world_position)
	if not node.is_empty():
		_focus_world_node(node)
		return true

	target_position = world_position
	active_memory_door_node = {}
	_sync_memory_door_trigger()
	return false


func _frontend_node_at_world_position(world_position: Vector2) -> Dictionary:
	if not _has_frontend_pack():
		return {}

	var selected_layer: Dictionary = {}
	var selected_z := -2147483648
	var layers: Array = frontend_pack.get("layers", [])
	for layer_value in layers:
		if typeof(layer_value) != TYPE_DICTIONARY:
			continue
		var layer: Dictionary = layer_value
		if String(layer.get("kind", "")) != "spot":
			continue
		var position_data: Dictionary = layer.get("position", {})
		var rect := _frontend_rect(position_data)
		if not rect.has_point(world_position):
			continue
		var z_index := int(position_data.get("zIndex", 0))
		if selected_layer.is_empty() or z_index >= selected_z:
			selected_layer = layer
			selected_z = z_index

	if selected_layer.is_empty():
		return {}
	return _state_node_for_frontend_layer(selected_layer)


func _focus_world_node(node: Dictionary) -> void:
	target_position = _walk_target_for_node(node)
	current_room_node = node
	if _is_memory_door_node(node):
		active_memory_door_node = node
		_close_room()
		_set_status("走向记忆馆 · 靠近后自动进入记忆室")
		_sync_memory_door_trigger()
		return

	active_memory_door_node = {}
	_sync_memory_door_trigger()
	_show_room(node)
	_set_status("前往 " + String(node.get("name", "地点")) + "，进入 " + String(node.get("room", "房间")))


func _on_memory_room_object_input(_viewport: Node, event: InputEvent, _shape_idx: int, layer: Dictionary) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		target_position = _walk_target_for_memory_layer(layer)
		_show_memory_object(layer)
		_set_status("记忆室 · %s · %s" % [String(layer.get("label", "记忆物件")), _memory_room_primary_action(layer)])
		get_viewport().set_input_as_handled()


func _show_room(node: Dictionary) -> void:
	var room := String(node.get("room", "节点"))
	var unlocks: Array = node.get("unlocks", [])
	var rooms: Array = node.get("rooms", [])
	if not visited_rooms.has(room):
		visited_rooms.append(room)
	room_panel.visible = true
	room_title.text = "%s · %s" % [String(node.get("name", "")), room]
	room_body.text = "空间角色：%s\n已解锁：%s\n房间：%s\n状态：可探索" % [
		_role_label(String(node.get("role", "unknown"))),
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


func _show_memory_object(layer: Dictionary) -> void:
	var label := String(layer.get("label", "记忆物件"))
	var role := String(layer.get("role", "记忆素材"))
	var material_type := String(layer.get("materialType", "memory"))
	if not visited_rooms.has(label):
		visited_rooms.append(label)

	room_panel.visible = true
	room_title.text = "记忆室 · " + label
	room_body.text = "素材类型：%s\n对象角色：%s\n当前动作：%s\n状态：已连接到记忆工具流" % [
		_memory_material_copy(material_type),
		role,
		_memory_room_primary_action(layer)
	]
	_render_memory_room_actions(layer)

	var texture := _load_memory_room_texture(String(layer.get("src", "")))
	room_sprite.texture = texture
	room_sprite.position = Vector2(1120, 410)
	room_sprite.scale = Vector2(0.42, 0.42)
	room_sprite.visible = texture != null


func _render_room_actions(node: Dictionary) -> void:
	for child in room_actions.get_children():
		child.queue_free()
	_add_room_button("查看事件列表", _show_events.bind(node))
	_add_room_button("时间轴回放", _show_timeline.bind(node))
	_add_room_button("询问 AI 建议", _show_ai_advice.bind(node))
	_add_room_button("完成今日任务", _complete_current_room_task.bind(node))
	_add_room_button("关闭房间", _close_room)


func _render_memory_room_actions(layer: Dictionary) -> void:
	for child in room_actions.get_children():
		child.queue_free()

	var actions: Array = layer.get("actions", [])
	for action_value in actions:
		if typeof(action_value) != TYPE_DICTIONARY:
			continue
		var action: Dictionary = action_value
		_add_room_button(String(action.get("label", "打开")), _show_memory_action.bind(layer, action))
	_add_room_button("关闭面板", _close_room)


func _add_room_button(text: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = text
	_apply_ui_text(button)
	_apply_button_style(button, false)
	button.pressed.connect(callback)
	room_actions.add_child(button)


func _show_memory_action(layer: Dictionary, action: Dictionary) -> void:
	var label := String(layer.get("label", "记忆物件"))
	var action_type := String(action.get("type", "open_memory"))
	var action_label := String(action.get("label", "打开"))
	match action_type:
		"play_audio_memory":
			room_body.text = "播放语音\n%s 正在读取一次语音记忆。\n转写摘要会同步到时间台和关联地点。" % label
		"replay_timeline":
			room_body.text = "AI 总结\n时间台已按照片、音频、笔记和地点重新串联。\n今日回放会优先展示高价值片段。"
		"open_location_graph":
			room_body.text = "地点关联\n地图墙展示照片 GPS、常去地点和旅行足迹。\n相近地点会自动合并为地点画像。"
		"open_photo_album":
			room_body.text = "照片列表\n相册已筛选珍藏照片和未整理图片。\n可继续进入导入台补齐时间、地点与人物。"
		"open_book_library", "open_note_list":
			room_body.text = "记忆列表\n%s 已打开。\n笔记、书摘和重要记录会按主题进入书架。" % label
		_:
			room_body.text = "%s\n%s 已执行，记忆工具流会继续整理。" % [action_label, label]
	_set_status("%s · %s" % [label, action_label])
	_spawn_reward_burst(player.position + Vector2(0, -72))


func _show_events(node: Dictionary) -> void:
	var unlocks: Array = node.get("unlocks", [])
	room_body.text = "事件列表\n- 最近访问：" + String(node.get("name", "")) + "\n- 解锁：" + ", ".join(unlocks) + "\n- 地点画像已更新。"
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
	room_body.text = "任务完成\n" + String(node.get("name", "")) + " 已收到一次正反馈。\n下一轮会更新地点画像与世界状态。"


func _complete_task(task: String) -> void:
	if not completed_tasks.has(task):
		completed_tasks.append(task)
	_render_tasks()
	_set_status("任务完成：" + task)
	_spawn_reward_burst(player.position + Vector2(0, -72))


func _close_room() -> void:
	room_panel.visible = false
	room_sprite.visible = false
	_set_status("回到记忆室探索" if _is_memory_room_mode() else "回到世界探索")


func _request_return_to_app() -> void:
	_write_session_result("completed")
	_post_web_session_result("completed", true)
	if not OS.has_feature("web"):
		get_tree().quit()


func _write_session_result(status: String) -> void:
	if session_written or session_output_path.is_empty():
		return

	var payload := _build_session_payload(status)
	payload["sessionPath"] = session_output_path
	var file := FileAccess.open(session_output_path, FileAccess.WRITE)
	if file == null:
		push_error("Unable to write Godot session output: %s" % session_output_path)
		return
	file.store_string(JSON.stringify(payload, "  "))
	file.store_string("\n")
	session_written = true


func _post_web_session_result(status: String, return_to_app: bool) -> void:
	if not OS.has_feature("web") or web_session_sent:
		return

	var payload_json := JSON.stringify(_build_session_payload(status))
	var return_flag := "true" if return_to_app else "false"
	var script := "window.parent && window.parent.postMessage({type:'memory-map:godot-session',session:%s,returnToApp:%s},'*');" % [payload_json, return_flag]
	JavaScriptBridge.eval(script, true)
	web_session_sent = true


func _build_session_payload(status: String) -> Dictionary:
	return {
		"sessionId": "session-%s-%s" % [session_world_slug, str(Time.get_unix_time_from_system())],
		"status": status,
		"worldSlug": session_world_slug,
		"completedTasks": completed_tasks,
		"visitedRooms": visited_rooms
	}


func _frontend_layer_by_key(key: String) -> Dictionary:
	var layers: Array = frontend_pack.get("layers", [])
	for layer_value in layers:
		if typeof(layer_value) == TYPE_DICTIONARY:
			var layer: Dictionary = layer_value
			if String(layer.get("key", "")) == key:
				return layer
	return {}


func _memory_room_layer_by_key(key: String) -> Dictionary:
	var layers: Array = memory_room_map.get("layers", [])
	for layer_value in layers:
		if typeof(layer_value) == TYPE_DICTIONARY:
			var layer: Dictionary = layer_value
			if String(layer.get("key", "")) == key:
				return layer
	return {}


func _frontend_rect(position_data: Dictionary) -> Rect2:
	var left := _frontend_position_value(String(position_data.get("left", "0")), FRONTEND_MAP_SIZE.x)
	var top := _frontend_position_value(String(position_data.get("top", "0")), FRONTEND_MAP_SIZE.y)
	var width := _frontend_position_value(String(position_data.get("width", "0")), FRONTEND_MAP_SIZE.x)
	var height := _frontend_position_value(String(position_data.get("height", "0")), FRONTEND_MAP_SIZE.y)
	return Rect2(
		frontend_map_top_left + Vector2(left, top) * frontend_map_scale,
		Vector2(width, height) * frontend_map_scale
	)


func _memory_room_rect(layer: Dictionary) -> Rect2:
	var hit_area: Dictionary = layer.get("hitArea", {})
	if hit_area.is_empty():
		var placement: Dictionary = layer.get("placement", {})
		hit_area = placement.get("box", {})

	var left := float(hit_area.get("left", 0.0))
	var top := float(hit_area.get("top", 0.0))
	var width := float(hit_area.get("width", 1.0))
	var height := float(hit_area.get("height", 1.0))
	return Rect2(
		memory_room_top_left + Vector2(left, top) * memory_room_scale,
		Vector2(width, height) * memory_room_scale
	)


func _walk_target_for_memory_layer(layer: Dictionary) -> Vector2:
	var rect := _memory_room_rect(layer)
	return rect.position + Vector2(rect.size.x * 0.5, rect.size.y * 0.84)


func _is_memory_door_node(node: Dictionary) -> bool:
	var role := String(node.get("role", "")).to_lower()
	var room := String(node.get("room", ""))
	var node_id := String(node.get("id", "")).to_lower()
	return role == "memory" or room == "记忆馆" or node_id.contains("memory")


func _can_enter_active_memory_door() -> bool:
	if door_transitioning or player == null or active_memory_door_node.is_empty():
		return false
	if not _is_memory_door_node(active_memory_door_node):
		return false
	return player.position.distance_to(_walk_target_for_node(active_memory_door_node)) <= MEMORY_DOOR_TRIGGER_DISTANCE


func _sync_memory_door_trigger() -> void:
	if memory_door_prompt == null:
		return
	var can_enter := _can_enter_active_memory_door()
	memory_door_prompt.visible = can_enter
	if can_enter:
		memory_door_prompt.text = "正在进入记忆室"
		_begin_memory_door_transition()


func _begin_memory_door_transition() -> void:
	if door_transitioning:
		return
	door_transitioning = true
	movement_locked = true
	if player != null:
		target_position = player.position
		_play_player_animation("idle")
	_hide_memory_door_prompt()
	if room_panel != null:
		room_panel.visible = false
	if room_sprite != null:
		room_sprite.visible = false
	_set_status("记忆馆门正在打开")
	_play_memory_door_animation()
	_start_memory_door_fade()


func _hide_memory_door_prompt() -> void:
	if memory_door_prompt != null:
		memory_door_prompt.visible = false


func _play_memory_door_animation() -> void:
	var entry := _generated_animation_entry("door_open", "door_animation")
	if entry.is_empty():
		_spawn_memory_door_fallback()
		return

	var frames := SpriteFrames.new()
	frames.add_animation("door_open")
	frames.set_animation_loop("door_open", false)
	frames.set_animation_speed("door_open", float(entry.get("fps", 12)))
	if not _add_generated_strip_frames(frames, "door_open", entry):
		_spawn_memory_door_fallback()
		return

	var sprite := AnimatedSprite2D.new()
	sprite.name = "MemoryDoorAnimation"
	sprite.sprite_frames = frames
	sprite.animation = "door_open"
	sprite.position = _memory_door_animation_position()
	sprite.scale = Vector2(0.72, 0.72)
	sprite.z_index = int(sprite.position.y) + 180
	world_layer.add_child(sprite)
	sprite.play("door_open")


func _spawn_memory_door_fallback() -> void:
	var glow := ColorRect.new()
	glow.name = "MemoryDoorAnimation"
	glow.color = Color(1.0, 0.82, 0.36, 0.0)
	glow.size = Vector2(92, 116)
	glow.position = _memory_door_animation_position() - glow.size * 0.5
	glow.z_index = int(glow.position.y) + 180
	world_layer.add_child(glow)
	var tween := create_tween()
	tween.tween_property(glow, "color:a", 0.48, 0.18).set_trans(Tween.TRANS_SINE)
	tween.tween_property(glow, "color:a", 0.12, 0.28).set_trans(Tween.TRANS_SINE)


func _memory_door_animation_position() -> Vector2:
	if active_memory_door_node.is_empty():
		return player.position if player != null else Vector2.ZERO
	return _walk_target_for_node(active_memory_door_node) + Vector2(0, -96)


func _start_memory_door_fade() -> void:
	var overlay := get_node_or_null("Layer3Overlay")
	if overlay == null:
		return
	var existing := overlay.get_node_or_null("MemoryDoorFade")
	if existing != null:
		existing.queue_free()
	var fade := ColorRect.new()
	fade.name = "MemoryDoorFade"
	fade.color = Color(0.02, 0.03, 0.06, 1.0)
	fade.modulate.a = 0.0
	fade.size = get_viewport_rect().size
	fade.z_index = 3900
	overlay.add_child(fade)
	var tween := create_tween()
	tween.tween_property(fade, "modulate:a", 1.0, 0.45).set_trans(Tween.TRANS_SINE)
	tween.tween_interval(0.15)
	tween.tween_callback(_finish_memory_door_transition)


func _finish_memory_door_transition() -> void:
	if not visited_rooms.has("记忆馆"):
		visited_rooms.append("记忆馆")
	_set_requested_room("memory")
	door_transitioning = false
	movement_locked = false
	active_memory_door_node = {}
	_set_status("进入记忆室")
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.location.href = '/godot-web/index.html?room=memory&boot=' + Date.now();", true)


func _memory_room_primary_action(layer: Dictionary) -> String:
	var actions: Array = layer.get("actions", [])
	for action_value in actions:
		if typeof(action_value) == TYPE_DICTIONARY:
			var action: Dictionary = action_value
			return String(action.get("label", "打开"))
	return "打开记忆"


func _memory_material_copy(material_type: String) -> String:
	var labels := {
		"book": "书与笔记",
		"location": "地理位置",
		"note": "笔记",
		"photo": "照片",
		"audio": "音频",
		"timeline": "回放时间线"
	}
	return String(labels.get(material_type, material_type))


func _frontend_position_value(value: String, total: float) -> float:
	if value.ends_with("%"):
		return value.trim_suffix("%").to_float() * total / 100.0
	return value.to_float()


func _public_asset_to_res_path(path: String) -> String:
	if path.begins_with("/assets/"):
		return "res://" + path.trim_prefix("/")
	return path


func _load_memory_room_texture(path: String) -> Texture2D:
	var res_path := _public_asset_to_res_path(path)
	if ResourceLoader.exists(res_path):
		var texture: Texture2D = load(res_path)
		if texture != null:
			return texture
	if not FileAccess.file_exists(res_path):
		return null

	var image := Image.new()
	var error := image.load(res_path)
	if error != OK:
		push_warning("Unable to read memory-room image: %s" % res_path)
		return null
	return ImageTexture.create_from_image(image)


func _resolve_ui_font() -> Font:
	for font_path in UI_FONT_PATHS:
		if ResourceLoader.exists(String(font_path)) or FileAccess.file_exists(String(font_path)):
			var font_resource := load(String(font_path))
			if font_resource is Font:
				return font_resource
	push_warning("Missing CJK UI font; Chinese text may render as tofu boxes.")
	return null


func _configure_ui_font() -> void:
	ui_font = _resolve_ui_font()
	if ui_font == null:
		return
	ThemeDB.set_fallback_font(ui_font)


func _apply_ui_text(control: Control, font_size: int = 0) -> void:
	if ui_font != null:
		control.add_theme_font_override("font", ui_font)
	if font_size > 0:
		control.add_theme_font_size_override("font_size", font_size)


func _apply_panel_style(panel: PanelContainer) -> void:
	var style := _panel_style()
	panel.add_theme_stylebox_override("panel", style)


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_BG_CARD
	style.border_color = COLOR_BORDER
	style.set_border_width_all(1)
	style.set_corner_radius_all(16)
	style.content_margin_left = 16
	style.content_margin_top = 14
	style.content_margin_right = 16
	style.content_margin_bottom = 14
	style.shadow_color = Color(0.06, 0.09, 0.16, 0.08)
	style.shadow_size = 18
	style.shadow_offset = Vector2(0, 8)
	return style


func _apply_button_style(button: Button, disabled: bool) -> void:
	button.add_theme_color_override("font_color", COLOR_TEXT_MAIN if disabled else Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_color_override("font_pressed_color", Color.WHITE)
	button.add_theme_color_override("font_disabled_color", COLOR_TEXT_MUTED)
	button.add_theme_stylebox_override("normal", _button_style(COLOR_PRIMARY_STRONG if not disabled else COLOR_BG_SOFT))
	button.add_theme_stylebox_override("hover", _button_style(COLOR_PRIMARY_HOVER if not disabled else COLOR_BG_SOFT))
	button.add_theme_stylebox_override("pressed", _button_style(COLOR_PRIMARY_HOVER if not disabled else COLOR_BG_SOFT))
	button.add_theme_stylebox_override("disabled", _button_style(COLOR_BG_SOFT))


func _button_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Color(0.0, 0.0, 0.0, 0.0)
	style.set_corner_radius_all(12)
	style.content_margin_left = 12
	style.content_margin_top = 8
	style.content_margin_right = 12
	style.content_margin_bottom = 8
	return style


func _user_facing_copy(text: String) -> String:
	return text.replace("Layer 1", "语义层").replace("Layer 2", "画像层").replace("Layer 3", "世界层").replace("Godot", "游戏")


func _role_label(role: String) -> String:
	var labels := {
		"home": "家",
		"work": "工作",
		"memory": "记忆",
		"finance": "财务",
		"life": "生活",
		"recovery": "恢复",
		"unknown": "未分配"
	}
	return String(labels.get(role, role))


func _sprite(asset_key: String, position: Vector2, scale_amount: float) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = _texture(asset_key)
	sprite.position = position
	sprite.scale = Vector2(scale_amount, scale_amount)
	return sprite


func _create_player_frames() -> SpriteFrames:
	var frames := SpriteFrames.new()
	var generated_walk := _generated_animation_entry("walk")
	frames.add_animation("idle")
	frames.set_animation_loop("idle", true)
	frames.set_animation_speed("idle", 6.0)
	var generated_idle := _generated_strip_frame_texture(generated_walk, 0)
	if generated_idle != null:
		frames.add_frame("idle", generated_idle)
	else:
		frames.add_frame("idle", _texture("player"))

	frames.add_animation("walk")
	frames.set_animation_loop("walk", true)
	frames.set_animation_speed("walk", 12.0)

	if generated_walk.is_empty():
		frames.add_frame("walk", _texture("player"))
		return frames

	if not _add_generated_strip_frames(frames, "walk", generated_walk):
		frames.add_frame("walk", _texture("player"))
		return frames
	frames.set_animation_speed("walk", float(generated_walk.get("fps", 12)))
	return frames


func _add_generated_strip_frames(frames: SpriteFrames, animation_name: String, generated: Dictionary) -> bool:
	var frame_count := int(generated.get("frame_count", 1))
	if frame_count <= 0:
		return false
	for index in range(frame_count):
		var atlas := _generated_strip_frame_texture(generated, index)
		if atlas == null:
			return false
		frames.add_frame(animation_name, atlas)
	return true


func _generated_strip_frame_texture(generated: Dictionary, index: int) -> AtlasTexture:
	if generated.is_empty() or index < 0:
		return null
	var texture: Texture2D = load(String(generated.get("sheet", "")))
	if texture == null:
		return null
	var frame_count := int(generated.get("frame_count", 1))
	var frame_size := int(generated.get("frame_size", 256))
	if frame_count <= 0 or frame_size <= 0 or index >= frame_count:
		return null
	var atlas := AtlasTexture.new()
	atlas.atlas = texture
	atlas.region = Rect2(index * frame_size, 0, frame_size, frame_size)
	return atlas


func _generated_animation_entry(animation_name: String, kind: String = "character_animation") -> Dictionary:
	var assets: Array = generated_assets.get("assets", [])
	for item in assets:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("kind", "")) == kind and String(item.get("animation", "")) == animation_name:
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


func _keyboard_movement_vector() -> Vector2:
	var movement := Vector2.ZERO
	var keys := [KEY_A, KEY_LEFT, KEY_D, KEY_RIGHT, KEY_W, KEY_UP, KEY_S, KEY_DOWN]
	for key in keys:
		if Input.is_key_pressed(key):
			movement += _movement_vector_from_key(key)
	if movement.length() > 1.0:
		return movement.normalized()
	return movement


func _movement_vector_from_key(keycode: int) -> Vector2:
	match keycode:
		KEY_A, KEY_LEFT:
			return Vector2.LEFT
		KEY_D, KEY_RIGHT:
			return Vector2.RIGHT
		KEY_W, KEY_UP:
			return Vector2.UP
		KEY_S, KEY_DOWN:
			return Vector2.DOWN
		_:
			return Vector2.ZERO


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
