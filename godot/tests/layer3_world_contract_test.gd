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
	_assert_design_system_overlay(scene)

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
