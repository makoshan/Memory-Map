extends SceneTree

const WORLD_SCENE := "res://scenes/layer3_world.tscn"

var failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var scene: Node = load(WORLD_SCENE).instantiate()
	root.add_child(scene)
	await process_frame

	_assert_chinese_font(scene)
	_assert_frontend_walk_target(scene)
	_assert_keyboard_walk_input(scene)
	_assert_generated_player_walk_animation(scene)
	_assert_player_walk_leg_pose(scene)
	_assert_design_system_overlay(scene)
	_assert_memory_room_web_args(scene)
	_assert_memory_door_transition_contract(scene)
	await _assert_memory_room_mode_contract()

	if failures.is_empty():
		print("Layer3World contract tests passed")
		quit(0)
		return

	for failure in failures:
		push_error(failure)
	quit(1)


func _assert_chinese_font(scene: Node) -> void:
	if not scene.has_method("_resolve_ui_font"):
		fail("Layer3World should expose _resolve_ui_font for bundled CJK UI text")
		return
	var font: Font = scene._resolve_ui_font()
	if font == null:
		fail("Layer3World should resolve a bundled CJK UI font")
		return
	if not font.has_char("杭".unicode_at(0)):
		fail("Layer3World UI font should include Simplified Chinese glyphs")
	if ThemeDB.get_fallback_font() != font:
		fail("Layer3World should register the CJK font as the global ThemeDB fallback font")


func _assert_frontend_walk_target(scene: Node) -> void:
	if not scene.has_method("_walk_target_for_frontend_layer"):
		fail("Layer3World should derive walk targets from rendered frontend layer rects")
		return
	if not scene.has_method("_walk_target_for_node"):
		fail("Layer3World should resolve node walk targets from frontend-aware metadata")
		return
	var home_layer: Dictionary = scene._frontend_layer_by_key("home")
	var home_node: Dictionary = scene._state_node_for_frontend_layer(home_layer)
	var expected_target: Vector2 = scene._walk_target_for_frontend_layer(home_layer)
	var actual_target: Vector2 = scene._walk_target_for_node(home_node)

	if actual_target.distance_to(expected_target) > 0.1:
		fail("Frontend click target should use the rendered island rect, not legacy world_state coordinates")


func _assert_keyboard_walk_input(scene: Node) -> void:
	if not scene.has_method("_movement_vector_from_key"):
		fail("Layer3World should map WASD and arrow keys into movement vectors")
		return
	if scene._movement_vector_from_key(KEY_D) != Vector2.RIGHT:
		fail("D should move the player right")
	if scene._movement_vector_from_key(KEY_RIGHT) != Vector2.RIGHT:
		fail("Right arrow should move the player right")
	if scene._movement_vector_from_key(KEY_W) != Vector2.UP:
		fail("W should move the player up")
	if scene._movement_vector_from_key(KEY_UP) != Vector2.UP:
		fail("Up arrow should move the player up")


func _assert_generated_player_walk_animation(scene: Node) -> void:
	var player := scene.get_node_or_null("GeneratedLayer3World/Player") as AnimatedSprite2D
	if player == null:
		fail("Layer3World should render the player as an AnimatedSprite2D")
		return
	if player.sprite_frames == null or not player.sprite_frames.has_animation("walk"):
		fail("Player should expose a walk animation")
		return
	var walk_frame_count := player.sprite_frames.get_frame_count("walk")
	if walk_frame_count < 12:
		fail("Player walk animation should use the generated 12-frame sprite sheet, including the frontend-map scene")
	var idle_texture := player.sprite_frames.get_frame_texture("idle", 0)
	if not (idle_texture is AtlasTexture):
		fail("Player idle frame should reuse the first generated walk frame so the character identity does not pop")
	if not scene.has_method("_play_player_animation"):
		fail("Layer3World should switch player animations through _play_player_animation")
		return
	scene._play_player_animation("walk")
	if player.animation != "walk" or not player.is_playing():
		fail("Player should play the walk animation when movement starts")


func _assert_player_walk_leg_pose(scene: Node) -> void:
	if not scene.has_method("_update_player_walk_pose"):
		fail("Layer3World should expose a procedural leg pose fallback for weak generated walk sheets")
		return

	var player := scene.get_node_or_null("GeneratedLayer3World/Player") as AnimatedSprite2D
	if player == null:
		fail("Layer3World should render the player before attaching leg walk pose nodes")
		return

	var pose := player.get_node_or_null("WalkPose") as Node2D
	var left_leg := player.get_node_or_null("WalkPose/LeftLeg") as Node2D
	var right_leg := player.get_node_or_null("WalkPose/RightLeg") as Node2D
	if pose == null or left_leg == null or right_leg == null:
		fail("Player should include named leg pose nodes so walking is visible even when the generated sheet is subtle")
		return
	if not pose.show_behind_parent:
		fail("Leg pose overlay should render behind the generated character sheet so it does not look pasted on")
	var left_shoe := left_leg.get_node_or_null("Shoe") as Polygon2D
	if left_shoe != null and left_shoe.color.r > 0.75 and left_shoe.color.g > 0.75 and left_shoe.color.b > 0.75:
		fail("Leg pose overlay should not add bright white shoes over the character art")

	scene._update_player_walk_pose(false, Vector2.ZERO)
	if pose.visible:
		fail("Leg pose overlay should stay hidden while the player is idle")

	player.frame = 3
	scene._update_player_walk_pose(true, Vector2.RIGHT)
	if not pose.visible:
		fail("Leg pose overlay should be visible while the player is walking")
	if absf(left_leg.rotation) < 0.02 or absf(right_leg.rotation) < 0.02:
		fail("Walking leg pose should rotate both legs enough to read as a step")
	if signf(left_leg.rotation) == signf(right_leg.rotation):
		fail("Walking leg pose should swing left and right legs in opposite directions")


func _assert_design_system_overlay(scene: Node) -> void:
	var overlay := scene.get_node_or_null("Layer3Overlay")
	if overlay == null:
		fail("Layer3World should render an overlay layer")
		return

	var ai_panel := overlay.get_node_or_null("AiInsightPanel") as PanelContainer
	var task_panel := overlay.get_node_or_null("TaskPanel") as PanelContainer
	var room_panel := overlay.get_node_or_null("RoomPanel") as PanelContainer
	if ai_panel == null or task_panel == null or room_panel == null:
		fail("Layer3World overlay panels should be named and testable")
		return

	var panel_style := ai_panel.get_theme_stylebox("panel") as StyleBoxFlat
	if panel_style == null:
		fail("Layer3World overlay should use a light StyleBoxFlat panel style")
	elif panel_style.bg_color.r < 0.92 or panel_style.bg_color.g < 0.92 or panel_style.bg_color.b < 0.92:
		fail("Layer3World overlay panels should use the white card surface from DESIGN.md")

	var label_text := _collect_label_text(overlay)
	if label_text.contains("Layer 1") or label_text.contains("Layer 2") or label_text.contains("Layer 3") or label_text.contains("Godot"):
		fail("Layer3World overlay copy should not expose implementation layer or engine terms")

	var home_layer: Dictionary = scene._frontend_layer_by_key("home")
	var home_node: Dictionary = scene._state_node_for_frontend_layer(home_layer)
	scene._show_room(home_node)
	label_text = _collect_label_text(overlay)
	if label_text.contains("Layer 1") or label_text.contains("Layer 2") or label_text.contains("Layer 3") or label_text.contains("Godot"):
		fail("Layer3World room panel copy should stay user-facing after opening a room")


func _assert_memory_room_web_args(scene: Node) -> void:
	if not scene.has_method("_apply_session_args"):
		fail("Layer3World should parse explicit Godot Web launch args")
		return
	scene.set("requested_room", "world")
	scene.set("session_world_slug", "hangzhou")
	scene._apply_session_args(["--main-pack", "index.pck", "--room", "memory"])
	if scene.get("requested_room") != "memory":
		fail("Godot Web --room memory arg should select the memory room")
	if scene.get("session_world_slug") != "memory-room":
		fail("Godot Web --room memory arg should switch the session slug")
	scene.set("requested_room", "world")
	scene.set("session_world_slug", "hangzhou")
	scene._apply_room_search_params("?room=memory")
	if scene.get("requested_room") != "memory":
		fail("Godot Web location.search room=memory should select the memory room")
	scene.set("requested_room", "world")
	scene.set("session_world_slug", "hangzhou")


func _assert_memory_door_transition_contract(scene: Node) -> void:
	if not scene.has_method("_is_memory_door_node"):
		fail("Layer3World should identify the memory building as a door trigger")
		return
	if not scene.has_method("_sync_memory_door_trigger"):
		fail("Layer3World should expose automatic trigger sync for the memory door")
		return
	if not scene.has_method("_begin_memory_door_transition"):
		fail("Layer3World should expose a memory door transition entrypoint")
		return
	if not scene.has_method("_finish_memory_door_transition"):
		fail("Layer3World should expose a memory-room switch after the door animation")
		return
	if not scene.has_method("_handle_world_click_at"):
		fail("Layer3World should expose a frontend-map click fallback for rendered building rects")
		return

	var memory_layer: Dictionary = scene._frontend_layer_by_key("memory")
	var memory_node: Dictionary = scene._state_node_for_frontend_layer(memory_layer)
	if not scene._is_memory_door_node(memory_node):
		fail("The memory frontend layer should resolve to a memory door node")
		return
	if scene.get_node_or_null("GeneratedLayer3World/FrontendClickArea_memory") == null:
		fail("The memory building should expose a named frontend click area")
		return

	var player: Node2D = scene.get_node_or_null("GeneratedLayer3World/Player")
	if player == null:
		fail("Layer3World should render the player inside the generated world layer")
		return

	player.position = Vector2(-640, 320)
	scene.set("target_position", player.position)
	var memory_rect: Rect2 = scene._frontend_rect(memory_layer.get("position", {}))
	scene._handle_world_click_at(memory_rect.position + memory_rect.size * 0.5)
	var active_node: Dictionary = scene.get("active_memory_door_node")
	if active_node.is_empty() or not scene._is_memory_door_node(active_node):
		fail("Clicking the rendered memory museum should select it as the active automatic door")
	if scene.get("target_position").distance_to(scene._walk_target_for_node(memory_node)) > 0.1:
		fail("Clicking the rendered memory museum should walk the player to the door target")

	player.position = scene._walk_target_for_node(memory_node)
	scene.set("target_position", player.position)
	scene._sync_memory_door_trigger()

	if scene.get("movement_locked") != true:
		fail("Approaching the memory door should automatically lock player movement")
	if scene.get("door_transitioning") != true:
		fail("Approaching the memory door should automatically start the transition")
	if scene.get_node_or_null("Layer3Overlay/MemoryDoorFade") == null:
		fail("Automatic memory door transition should create a named fade overlay")

	scene._finish_memory_door_transition()
	if scene.get("requested_room") != "memory":
		fail("Memory door transition should switch the scene request to memory-room mode")
	if scene.get("session_world_slug") != "memory-room":
		fail("Memory door transition should update the session slug to memory-room")


func _assert_memory_room_mode_contract() -> void:
	var memory_scene: Node = load(WORLD_SCENE).instantiate()
	if not memory_scene.has_method("_is_memory_room_mode"):
		fail("Layer3World should expose a memory-room mode for /game?room=memory")
		memory_scene.queue_free()
		return

	memory_scene.set("requested_room", "memory")
	root.add_child(memory_scene)
	await process_frame

	if not memory_scene._is_memory_room_mode():
		fail("Memory-room mode should stay active after scene startup")

	var memory_layer := memory_scene.get_node_or_null("MemoryRoomLayer")
	if memory_layer == null:
		fail("Memory-room mode should render a dedicated MemoryRoomLayer")
	else:
		if memory_layer.get_node_or_null("MemoryRoomClickArea_bookshelf") == null:
			fail("Memory-room mode should expose a clickable bookshelf area")
		if memory_layer.get_node_or_null("MemoryRoomClickArea_audio-machine") == null:
			fail("Memory-room mode should expose a clickable audio machine area")

	if not memory_scene.has_method("_memory_room_layer_by_key"):
		fail("Layer3World should resolve memory-room layers by key for interactions")
		memory_scene.queue_free()
		return

	var audio_layer: Dictionary = memory_scene._memory_room_layer_by_key("audio-machine")
	if audio_layer.is_empty():
		fail("Memory-room map should include the audio-machine layer")
	else:
		memory_scene._show_memory_object(audio_layer)
		var overlay := memory_scene.get_node_or_null("Layer3Overlay")
		var label_text := _collect_label_text(overlay) if overlay != null else ""
		if not label_text.contains("音频机") or not label_text.contains("播放语音"):
			fail("Opening the audio machine should show a playable voice interaction")

	memory_scene.queue_free()


func _collect_label_text(root_node: Node) -> String:
	var text_parts: Array[String] = []
	_collect_label_text_into(root_node, text_parts)
	return "\n".join(text_parts)


func _collect_label_text_into(root_node: Node, text_parts: Array[String]) -> void:
	if root_node is Label:
		text_parts.append((root_node as Label).text)
	for child in root_node.get_children():
		_collect_label_text_into(child, text_parts)


func fail(message: String) -> void:
	failures.append(message)
