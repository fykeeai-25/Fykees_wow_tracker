-- Runs AzerothTrackerProbe.lua against a minimal mocked WoW API, plays a short
-- dungeon run (enter, one boss, loot for us and for a party member, a death, leave)
-- and prints AzerothTrackerProbeDB in SavedVariables format to stdout.
-- Usage: lua5.1 probe-harness.lua <AzerothTrackerProbe.lua>

local clock = 1761980000
time = function() return clock end
GetTime = function() return clock - 1761900000 end
GetRealmName = function() return "Firemaw" end
UnitName = function(unit) if unit == "player" then return "Thrall" end return nil end
UnitGUID = function(unit) if unit == "player" then return "Player-1-0000AAAA" end return nil end
UnitLevel = function() return 24 end
local xp = 1000
UnitXP = function() return xp end
UnitXPMax = function() return 9000 end
local money = 5000
GetMoney = function() return money end
GetBuildInfo = function() return "1.60.1", "70058", "Oct 1 2026", 16001 end
local inInstance = false
IsInInstance = function() return inInstance, inInstance and "party" or "none" end
GetInstanceInfo = function()
  if inInstance then return "Ragefire Chasm", "party", 1, "Normal", 5, 0, false, 389, 5 end
  return "Kalimdor", "none", 0, "", 0, 0, false, 1, 0
end
GetRealZoneText = function() return inInstance and "Ragefire Chasm" or "Orgrimmar" end
local groupSize = 0
GetNumGroupMembers = function() return groupSize end
print = function(...) io.stderr:write(table.concat({ ... }, " "), "\n") end

-- Events this mocked client does not know: RegisterEvent raises, like the real client.
local UNKNOWN = { CHALLENGE_MODE_COMPLETED = true }
local frames = {}
CreateFrame = function()
  local f = { events = {} }
  function f:SetScript(_, fn) self.handler = fn end
  function f:RegisterEvent(e)
    if UNKNOWN[e] then error("Attempt to register unknown event \"" .. e .. "\"") end
    self.events[e] = true
  end
  frames[#frames + 1] = f
  return f
end
SlashCmdList = {}

local chunk = assert(loadfile(arg[1]))
chunk("AzerothTrackerProbe")

local function fire(event, ...)
  for _, f in ipairs(frames) do
    if f.events[event] and f.handler then f.handler(f, event, ...) end
  end
end
local function tick(s) clock = clock + s end

fire("ADDON_LOADED", "AzerothTrackerProbe")
fire("PLAYER_LOGIN")
fire("PLAYER_ENTERING_WORLD", true, false)

-- join a group and enter the dungeon
groupSize = 5
fire("GROUP_ROSTER_UPDATE")
tick(60)
inInstance = true
fire("PLAYER_ENTERING_WORLD", false, false)
tick(300)
fire("ENCOUNTER_START", 1443, "Taragaman the Hungerer", 1, 5)
tick(45)
fire("ENCOUNTER_END", 1443, "Taragaman the Hungerer", 1, 5, 1)
fire("BOSS_KILL", 1443, "Taragaman the Hungerer")
xp = 1650
fire("PLAYER_XP_UPDATE", "player")
money = 5320
fire("PLAYER_MONEY")
fire("CHAT_MSG_LOOT", "You receive loot: |cff1eff00|Hitem:14149::::::::|h[Subterranean Cape]|h|r.",
  "Thrall", "", "", "Thrall", "", 0, 0, "", 0, 1, "Player-1-0000AAAA")
fire("CHAT_MSG_LOOT", "Garrosh receives loot: |cff1eff00|Hitem:14145::::::::|h[Cursed Felblade]|h|r.",
  "Garrosh", "", "", "Garrosh", "", 0, 0, "", 0, 2, "Player-1-0000BBBB")
fire("PLAYER_DEAD")
tick(600)
inInstance = false
fire("PLAYER_ENTERING_WORLD", false, false)
fire("PLAYER_LOGOUT")
SlashCmdList["AZEROTHTRACKERPROBE"]("")

local function serialize(v, indent)
  local t = type(v)
  if t == "string" then return string.format("%q", v) end
  if t ~= "table" then return tostring(v) end
  local pad = string.rep("\t", indent + 1)
  local out = { "{\n" }
  local n = #v
  for i = 1, n do out[#out + 1] = pad .. serialize(v[i], indent + 1) .. ", -- [" .. i .. "]\n" end
  local keys = {}
  for k in pairs(v) do
    if not (type(k) == "number" and k >= 1 and k <= n and k == math.floor(k)) then keys[#keys + 1] = k end
  end
  table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
  for _, k in ipairs(keys) do
    local key = type(k) == "string" and string.format("[%q]", k) or "[" .. tostring(k) .. "]"
    out[#out + 1] = pad .. key .. " = " .. serialize(v[k], indent + 1) .. ",\n"
  end
  out[#out + 1] = string.rep("\t", indent) .. "}"
  return table.concat(out)
end

io.write("\nAzerothTrackerProbeDB = ", serialize(AzerothTrackerProbeDB, 0), "\n")
