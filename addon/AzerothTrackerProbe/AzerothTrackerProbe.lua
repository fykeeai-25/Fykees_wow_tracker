-- AzerothTrackerProbe: a temporary research addon. It records which instance-related
-- events the WoW: Forever client really fires during a dungeon run, so the run-history
-- module can be built on facts instead of guesses. Data goes to AzerothTrackerProbeDB
-- (SavedVariables) on /reload or logout.
--
-- Fair play: only our own character. It never listens to the combat log, never stores
-- other players' names or loot, and never acts in the game.

local ADDON_NAME = ...
local PROBE_VERSION = "0.1.0"
local MAX_EVENTS = 3000

local db
local currentRun -- { name, instanceId, startedAt } while inside an instance
local lastXp, lastMoney

local function now() return time() end

-- Values the client hides from addons (Midnight-style "secret" values) are stored as a
-- marker, so we learn which ones are hidden instead of erroring.
local function safe(v)
  if issecretvalue and issecretvalue(v) then return "<secret>" end
  return v
end

local function apiExists(path)
  local t = _G
  for part in string.gmatch(path, "[^%.]+") do
    if type(t) ~= "table" then return false end
    t = t[part]
  end
  return t ~= nil
end

local function inInstance()
  if not IsInInstance then return false end
  local yes, kind = IsInInstance()
  return yes and kind ~= "none", kind
end

local function log(event, data)
  if not db then return end
  local entry = { t = now(), e = event, data = data }
  if inInstance() and GetRealZoneText then entry.zone = safe(GetRealZoneText()) end
  local list = db.events
  list[#list + 1] = entry
  while #list > MAX_EVENTS do table.remove(list, 1) end
end

-- ------------------------------------------------------------ diagnostics

-- APIs a run tracker might use. True/false is recorded on login.
local CANDIDATE_APIS = {
  "GetInstanceInfo", "IsInInstance", "GetRealZoneText", "GetNumGroupMembers",
  "GetNumSavedInstances", "GetSavedInstanceInfo", "RequestRaidInfo",
  "C_EncounterJournal.GetEncountersOnMap", "EJ_GetEncounterInfo", "EJ_GetInstanceInfo",
  "C_ChallengeMode.GetActiveKeystoneInfo", "C_Scenario.GetInfo", "C_ScenarioInfo.GetScenarioInfo",
  "C_LFGInfo.GetDungeonInfo", "GetLFGCompletionReward", "C_DateAndTime.GetServerTimeLocal",
  "UnitXP", "UnitXPMax", "GetMoney", "issecretvalue",
}

-- Events worth watching during a run. Ones the client does not know are recorded.
local WATCHED = {
  "PLAYER_ENTERING_WORLD", "ZONE_CHANGED_NEW_AREA", "UPDATE_INSTANCE_INFO",
  "INSTANCE_BOOT_START", "INSTANCE_BOOT_STOP", "INSTANCE_GROUP_SIZE_CHANGED",
  "ENCOUNTER_START", "ENCOUNTER_END", "BOSS_KILL",
  "LFG_COMPLETION_REWARD", "SCENARIO_COMPLETED", "CHALLENGE_MODE_COMPLETED",
  "PLAYER_DEAD", "PLAYER_ALIVE", "PLAYER_UNGHOST",
  "PLAYER_XP_UPDATE", "PLAYER_LEVEL_UP", "PLAYER_MONEY", "CHAT_MSG_LOOT",
  "GROUP_ROSTER_UPDATE",
}

local function updateDiagnostics()
  local build, buildNumber, _, interface = GetBuildInfo()
  db.client = { build = build, buildNumber = buildNumber, interface = interface, checkedAt = now() }
  local apis = {}
  for _, name in ipairs(CANDIDATE_APIS) do apis[name] = apiExists(name) end
  db.apis = apis
end

-- ------------------------------------------------------------ handlers

local function onEnteringWorld()
  local yes = inInstance()
  if yes and not currentRun and GetInstanceInfo then
    local name, instanceType, difficultyId, difficultyName, maxPlayers, _, _, instanceId = GetInstanceInfo()
    currentRun = { name = safe(name), instanceId = safe(instanceId), startedAt = now() }
    log("INSTANCE_ENTER", {
      name = safe(name), instanceType = safe(instanceType), difficultyId = safe(difficultyId),
      difficultyName = safe(difficultyName), maxPlayers = safe(maxPlayers), instanceId = safe(instanceId),
      groupSize = GetNumGroupMembers and GetNumGroupMembers() or nil,
    })
  elseif not yes and currentRun then
    log("INSTANCE_LEAVE", {
      name = currentRun.name, instanceId = currentRun.instanceId, seconds = now() - currentRun.startedAt,
    })
    currentRun = nil
  end
end

local function onLoot(text, _, _, _, _, _, _, _, _, _, _, guid)
  text = safe(text)
  if text == "<secret>" then return log("LOOT_SECRET", nil) end
  -- Only our own loot. Prefer the GUID; fall back to the client's "You receive" wording.
  local mine
  if guid and not (issecretvalue and issecretvalue(guid)) and UnitGUID then
    mine = guid == UnitGUID("player")
  else
    mine = type(text) == "string" and string.find(text, "^You ") ~= nil
  end
  if not mine or type(text) ~= "string" then return end
  local id = string.match(text, "item:(%d+)")
  local count = tonumber(string.match(text, "x(%d+)%.?$")) or 1
  log("LOOT_SELF", { itemId = id and tonumber(id) or nil, name = string.match(text, "%[(.-)%]"), count = count })
end

local handlers = {
  PLAYER_ENTERING_WORLD = onEnteringWorld,
  ZONE_CHANGED_NEW_AREA = onEnteringWorld,
  ENCOUNTER_START = function(id, name, difficultyId, groupSize)
    log("ENCOUNTER_START", { encounterId = safe(id), name = safe(name), difficultyId = safe(difficultyId), groupSize = safe(groupSize) })
  end,
  ENCOUNTER_END = function(id, name, difficultyId, groupSize, success)
    log("ENCOUNTER_END", { encounterId = safe(id), name = safe(name), difficultyId = safe(difficultyId), groupSize = safe(groupSize), success = safe(success) })
  end,
  BOSS_KILL = function(id, name) log("BOSS_KILL", { encounterId = safe(id), name = safe(name) }) end,
  PLAYER_XP_UPDATE = function(unit)
    if unit and unit ~= "player" then return end
    local xp = UnitXP and UnitXP("player")
    if not xp then return end
    if lastXp and xp > lastXp then log("PLAYER_XP_UPDATE", { gained = xp - lastXp }) end
    lastXp = xp
  end,
  PLAYER_LEVEL_UP = function(level)
    lastXp = UnitXP and UnitXP("player") or nil
    log("PLAYER_LEVEL_UP", { level = safe(level) })
  end,
  PLAYER_MONEY = function()
    local money = GetMoney and GetMoney()
    if not money then return end
    if lastMoney and money ~= lastMoney then log("PLAYER_MONEY", { change = money - lastMoney }) end
    lastMoney = money
  end,
  CHAT_MSG_LOOT = onLoot,
  -- Group size only; no names, classes or other details about other players.
  GROUP_ROSTER_UPDATE = function()
    if not currentRun then return end
    log("GROUP_ROSTER_UPDATE", { groupSize = GetNumGroupMembers and GetNumGroupMembers() or nil })
  end,
}

-- Events we only want to see fire (arguments are not stored).
local function genericHandler(event) return function() log(event, nil) end end

-- ------------------------------------------------------------ wiring

local frame = CreateFrame("Frame")
local unknown = {}

frame:SetScript("OnEvent", function(_, event, ...)
  if event == "ADDON_LOADED" then
    if ... ~= ADDON_NAME then return end
    AzerothTrackerProbeDB = AzerothTrackerProbeDB or {}
    db = AzerothTrackerProbeDB
    db.version = PROBE_VERSION
    db.events = db.events or {}
    db.unknownEvents = unknown
    return
  end
  if not db then return end
  if event == "PLAYER_LOGIN" then
    updateDiagnostics()
    lastXp = UnitXP and UnitXP("player") or nil
    lastMoney = GetMoney and GetMoney() or nil
    log("LOGIN", { level = UnitLevel and UnitLevel("player") or nil })
    return
  end
  if event == "PLAYER_LOGOUT" then
    if currentRun then log("LOGOUT_IN_INSTANCE", { name = currentRun.name }) end
    return
  end
  local handler = handlers[event] or genericHandler(event)
  handler(...)
end)

frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("PLAYER_LOGOUT")
for _, event in ipairs(WATCHED) do
  -- An unknown event raises an error in the client; that is exactly what we want to learn.
  if not pcall(frame.RegisterEvent, frame, event) then unknown[#unknown + 1] = event end
end

-- ---------------------------------------------------------- slash command

SLASH_AZEROTHTRACKERPROBE1 = "/atprobe"
SlashCmdList["AZEROTHTRACKERPROBE"] = function(msg)
  msg = msg and string.lower(msg) or ""
  if msg == "clear" then
    if db then db.events = {} end
    return print("|cffe0b44cAzerothTracker Probe|r: log cleared.")
  end
  local count = db and #db.events or 0
  print(string.format("|cffe0b44cAzerothTracker Probe|r %s: %d events logged%s. Unknown events: %s. Saved on /reload.",
    PROBE_VERSION, count, currentRun and (" (in " .. tostring(currentRun.name) .. ")") or "",
    #unknown > 0 and table.concat(unknown, ", ") or "none"))
end
