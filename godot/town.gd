extends Node2D

const ART = preload("res://sprites.png")
const SAVE = "user://town.json"
const INK = Color("#f6ddac")
const MINT = Color("#a9eed4")
const SPOTS = [
	Rect2(95, 469, 105, 110), Rect2(202, 469, 105, 110), Rect2(309, 469, 105, 110),
	Rect2(467, 426, 107, 143), Rect2(584, 426, 107, 143), Rect2(704, 426, 120, 143),
	Rect2(679, 258, 130, 126), Rect2(1050, 430, 153, 150)
]
var state := {
	"age": 0, "coin": 8, "herb": 3, "potion": 1, "bread": 0, "dust": 0,
	"plots": [0, 6, 12], "brew": true, "bake": false, "open": true,
	"ward": 0, "fight": 0, "hp": 0, "enemy": 0, "stamp": 0
}
var elapsed := 0.0
var animation := 0.0
var keeper := Vector2(650, 530)
var target := Vector2(650, 530)
var notice := ""
var notice_until := 0.0
var stars: Array[Vector2] = []

func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 17
	for i in range(110):
		stars.append(Vector2(rng.randf_range(0, 1280), rng.randf_range(20, 480)))
	if FileAccess.file_exists(SAVE):
		var loaded = JSON.parse_string(FileAccess.get_file_as_string(SAVE))
		if loaded is Dictionary:
			state.merge(loaded, true)
			var gap := clampi(int(Time.get_unix_time_from_system()) - int(state.stamp), 0, 28800)
			var old_coin: int = state.coin
			for i in range(gap):
				tick()
			if gap > 10:
				say("While you were away  ·  +%d coins" % (int(state.coin) - old_coin))
	save_game()

func save_game() -> void:
	state.stamp = int(Time.get_unix_time_from_system())
	var file := FileAccess.open(SAVE, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(state))

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_game()

func say(message: String) -> void:
	notice = message
	notice_until = animation + 4.5

func tick() -> void:
	state.age = int(state.age) + 1
	for i in range(3):
		state.plots[i] = int(state.plots[i]) + 1
		if state.plots[i] >= 24:
			state.plots[i] = 0
			state.herb += 1
	if state.age % 6 == 0 and state.brew and state.herb >= 2 and state.potion < 8:
		state.herb -= 2
		state.potion += 1
		target = Vector2(520, 550)
	if state.age % 7 == 0 and state.bake and state.herb >= 1 and state.bread < 8:
		state.herb -= 1
		state.bread += 1
		target = Vector2(640, 550)
	if state.age % 8 == 0 and state.open:
		if state.potion > 0 and (state.bread == 0 or state.age % 16 == 0):
			state.potion -= 1
			state.coin += 5
		elif state.bread > 0:
			state.bread -= 1
			state.coin += 3
		target = Vector2(775, 550)
	if state.fight > 0:
		state.fight += 1
		if state.fight % 3 == 0:
			state.enemy -= 3 + int(state.ward)
			if state.enemy <= 0:
				state.dust += 1
				state.coin += 9
				state.fight = 0
				say("The familiar returned  ·  +1 crystal")
			else:
				state.hp -= 2
				if state.hp <= 0:
					state.fight = 0
					say("The familiar retreated")

func _process(delta: float) -> void:
	animation += delta
	elapsed += delta
	while elapsed >= 1.0:
		elapsed -= 1.0
		tick()
		if state.age % 5 == 0:
			save_game()
	keeper = keeper.move_toward(target, delta * 105)
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		for i in range(SPOTS.size()):
			if SPOTS[i].has_point(get_local_mouse_position()):
				interact(i)
				save_game()
				break

func interact(index: int) -> void:
	match index:
		0, 1, 2:
			if state.plots[index] >= 16:
				state.plots[index] = 0
				state.herb += 1
				say("Moonleaf harvested")
			else:
				say("Moonleaf is growing")
		3:
			state.brew = not state.brew
			say("Brewing on" if state.brew else "Brewing paused")
		4:
			state.bake = not state.bake
			say("Baking on" if state.bake else "Baking paused")
		5:
			state.open = not state.open
			say("Shop open" if state.open else "Shop closed")
		6:
			if state.ward > 0:
				say("Your familiar is warded")
			elif state.dust > 0:
				state.dust -= 1
				state.ward = 1
				say("Séance complete  ·  Familiar attack increased")
			else:
				say("A séance ward needs one forest crystal")
		7:
			if state.fight > 0:
				say("Familiar %d HP  ·  Wraith %d HP" % [state.hp, state.enemy])
			elif state.potion > 0:
				state.potion -= 1
				state.fight = 1
				state.hp = 9
				state.enemy = 12
				say("Familiar dispatched  ·  1 potion used")
			else:
				say("Pack one potion for the familiar")

func sprite(index: int, area: Rect2, tint := Color.WHITE) -> void:
	var cell := ART.get_size() / 4.0
	var origin := Vector2(index % 4, floori(index / 4.0)) * cell
	draw_texture_rect_region(ART, area, Rect2(origin + Vector2.ONE, cell - Vector2(2, 2)), tint, false, true)

func label_at(at: Vector2, caption: String, size: int, ink := INK) -> void:
	draw_string(ThemeDB.fallback_font, at, caption, HORIZONTAL_ALIGNMENT_LEFT, -1, size, ink)

func roof(points: PackedVector2Array, color: Color) -> void:
	draw_colored_polygon(points, color)
	var border := points.duplicate()
	border.append(points[0])
	draw_polyline(border, Color("#826078"), 4, true)

func _draw() -> void:
	var dusk := (1.0 + sin(float(state.age) / 58.0)) * 0.5
	for i in range(72):
		var shade := Color("#10152c").lerp(Color("#674c72"), float(i) / 72.0 * dusk)
		draw_rect(Rect2(0, i * 10, 1280, 10), shade)
	for p in stars:
		draw_circle(p, 1.25, Color(1, .88, .7, .25 + .2 * sin(animation * 1.4 + p.x)))
	draw_circle(Vector2(1060, 154), 48, Color("#423b61"))
	draw_circle(Vector2(1060, 154), 36, Color("#e7d6ba"))
	for i in range(26):
		var x := float(i * 55 - 25)
		var height := 65.0 + float((i * 73) % 112)
		var y := 503.0 - height
		draw_rect(Rect2(x, y, 48, height), Color("#292940"))
		draw_colored_polygon(PackedVector2Array([Vector2(x - 7, y), Vector2(x + 22, y - 42), Vector2(x + 55, y)]), Color("#292940"))
		draw_rect(Rect2(x + 14, y + 18, 8, 13), Color("#9a7468"))
	draw_rect(Rect2(0, 551, 1280, 169), Color("#252c37"))
	for i in range(28):
		var x := float(i * 48)
		draw_line(Vector2(x, 616), Vector2(x + 29, 613), Color("#544454"), 3, true)
	draw_rect(Rect2(428, 240, 463, 321), Color("#493044"))
	draw_rect(Rect2(446, 264, 426, 280), Color("#694252"))
	roof(PackedVector2Array([Vector2(405, 255), Vector2(607, 144), Vector2(786, 175), Vector2(912, 255)]), Color("#302841"))
	draw_rect(Rect2(428, 386, 463, 13), Color("#2e2238"))
	draw_rect(Rect2(428, 552, 463, 14), Color("#2e2238"))
	for x in [433, 661, 878]:
		draw_rect(Rect2(x, 255, 12, 303), Color("#38283c"))
	for x in [493, 550, 816]:
		draw_rect(Rect2(x, 294, 38, 66), Color("#9f6571"))
		draw_rect(Rect2(x + 4, 299, 30, 56), Color("#d69a79"))
		draw_line(Vector2(x + 19, 299), Vector2(x + 19, 355), Color("#634554"), 3)
	draw_rect(Rect2(489, 203, 221, 41), Color("#483143"))
	label_at(Vector2(505, 233), "G H O S T   T O W N", 21)
	for i in range(3):
		var x := 96.0 + i * 107
		draw_rect(Rect2(x, 549, 100, 22), Color("#664854"))
		draw_rect(Rect2(x + 4, 546, 92, 12), Color("#3e303d"))
		var stage := mini(2, floori(float(state.plots[i]) / 8.0))
		sprite(stage, Rect2(x + sin(animation * 1.5 + i) * 3, 466, 100, 102))
	sprite(15, Rect2(677, 264, 133, 126))
	sprite(8, Rect2(keeper - Vector2(51, 113), Vector2(102, 119)))
	sprite(12, SPOTS[3], Color.WHITE if state.brew else Color("#a68e9e"))
	sprite(13, SPOTS[4], Color.WHITE if state.bake else Color("#a68e9e"))
	sprite(14, SPOTS[5])
	for i in range(int(state.potion)):
		sprite(4, Rect2(706 + (i % 4) * 23, 408 - floori(i / 4.0) * 22, 24, 29))
	for i in range(int(state.bread)):
		sprite(5, Rect2(735 + (i % 4) * 20, 453 - floori(i / 4.0) * 19, 24, 24))
	if state.open:
		var visit := fmod(float(state.age) + elapsed, 8.0)
		var guest_x := 972.0 - sin(visit / 8.0 * PI) * 175.0
		sprite(9, Rect2(guest_x, 471 + sin(animation * 3.0) * 4, 83, 85))
	draw_arc(Vector2(1123, 527), 58, PI, TAU, 32, Color("#94778f"), 8, true)
	draw_line(Vector2(1065, 527), Vector2(1065, 568), Color("#94778f"), 8)
	draw_line(Vector2(1181, 527), Vector2(1181, 568), Color("#94778f"), 8)
	var clash := sin(animation * 11.0) * 12 if state.fight > 0 else 0.0
	sprite(10, Rect2(1067 + clash, 501 + sin(animation * 2.0) * 4, 79, 75))
	if state.fight > 0:
		sprite(11, Rect2(1133 - clash, 472, 78, 90))
		draw_line(Vector2(1073, 491), Vector2(1073 + state.hp * 5, 491), MINT, 4)
		draw_line(Vector2(1147, 471), Vector2(1147 + state.enemy * 4, 471), Color("#df91ba"), 4)
	for i in range(20):
		var p := stars[i]
		var drift := Vector2(fmod(p.x + animation * (5 + i % 3), 1280), 440 + sin(animation + i) * 48 + i * 7)
		draw_circle(drift, 2, Color(1, .77, .45, .55))
	var resources := [state.coin, state.herb, state.potion, state.bread, state.dust]
	var icons := [6, 3, 4, 5, 7]
	for i in range(5):
		sprite(icons[i], Rect2(36 + i * 81, 32, 37, 37))
		label_at(Vector2(74 + i * 81, 57), str(int(resources[i])), 20)
	var hints := ["Moonleaf", "Moonleaf", "Moonleaf", "Toggle brewing", "Toggle baking", "Toggle shop", "Séance ward", "Forest expedition"]
	for i in range(SPOTS.size()):
		if SPOTS[i].has_point(get_local_mouse_position()):
			var at: Vector2 = SPOTS[i].get_center()
			draw_circle(Vector2(at.x, SPOTS[i].end.y + 5), 3, MINT)
			label_at(Vector2(at.x - 52, SPOTS[i].end.y + 32), hints[i], 15)
	if animation < notice_until:
		label_at(Vector2(43, 668), notice, 21, MINT)
	label_at(Vector2(43, 698), "Choose what the town makes while you are away.", 15)
