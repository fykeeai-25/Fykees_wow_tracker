-- Runs AzerothTracker.lua against a minimal mocked WoW Classic API, fires a
-- login / profession window / bank sequence and prints AzerothTrackerDB in
-- SavedVariables format to stdout. Usage: lua5.1 harness.lua <AzerothTracker.lua> [scenario]

local function link(id, name) return "|cffffffff|Hitem:" .. id .. "::::::::|h[" .. name .. "]|h|r" end

time = function() return 1761980000 end
GetRealmName = function() return "Firemaw" end
UnitName = function() return "Thrall" end
UnitRace = function() return "Orc", "Orc" end
UnitClass = function() return "Shaman", "SHAMAN" end
UnitLevel = function() return 24 end
GetMoney = function() return 123456 end
GetBuildInfo = function() return "1.60.1", "70058", "Oct 1 2026", 11600 end
C_LegacyTree = { GetPoints = function() return 9 end }
currencyRows = {
  { name = "Forever", isHeader = true, isHeaderExpanded = true },
  { name = "Merchant's Favor", isHeader = false, quantity = 7, currencyTypesID = 3101 },
}
C_CurrencyInfo = {
  GetCurrencyListSize = function() return #currencyRows end,
  GetCurrencyListInfo = function(i) return currencyRows[i] end,
}
print = function(...) io.stderr:write(table.concat({ ... }, " "), "\n") end

TRADE_SKILLS = "Professions"
SECONDARY_SKILLS = "Secondary Skills"
local skillLines = {
  { "Professions", true, true },
  { "Alchemy", false, false, 142, 150 },
  { "Herbalism", false, false, 160, 225 },
  { "Secondary Skills", true, true },
  { "Cooking", false, false, 50, 75 },
  { "Weapon Skills", true, true },
  { "Swords", false, false, 100, 120 },
}
GetNumSkillLines = function() return #skillLines end
GetSkillLineInfo = function(i)
  local l = skillLines[i]
  return l[1], l[2], l[3], l[4], 0, 0, l[5]
end

-- { name, type, reagents, spellId, createdItemId, createdItemName }
recipes = {
  { "Potions", "header" },
  { "Minor Healing Potion", "trivial", { { 2447, "Peacebloom", 1 }, { 2449, "Earthroot", 1 } }, 2330, 118, "Minor Healing Potion" },
  { "Elixir of Lion's Strength", "easy", { { 2449, "Earthroot", 1 }, { 765, "Silverleaf", 1 } }, 2329, 2454, "Elixir of Lion's Strength" },
}
local uncachedReagent = false
GetTradeSkillLine = function() return "Alchemy", 142, 150 end
GetNumTradeSkills = function() return #recipes end
GetTradeSkillInfo = function(i) return recipes[i][1], recipes[i][2] end
GetTradeSkillNumReagents = function(i) return recipes[i][3] and #recipes[i][3] or 0 end
GetTradeSkillReagentInfo = function(i, r) local x = recipes[i][3][r] return x[2], "icon", x[3], 0 end
GetTradeSkillReagentItemLink = function(i, r)
  if uncachedReagent and i == 2 and r == 2 then return nil end
  local x = recipes[i][3][r]
  return link(x[1], x[2])
end
GetTradeSkillRecipeLink = function(i)
  local x = recipes[i]
  if not x[4] then return nil end
  return "|cffffd000|Henchant:" .. x[4] .. "|h[" .. x[1] .. "]|h|r"
end
GetTradeSkillItemLink = function(i)
  local x = recipes[i]
  if not x[5] then return nil end
  return link(x[5], x[6])
end
GetTradeSkillNumMade = function() return 1, 1 end
GetCraftDisplaySkillLine = function() return nil end
GetNumCrafts = function() return 0 end
GetCraftInfo = function() return nil end
GetCraftNumReagents = function() return 0 end
GetCraftReagentInfo = function() return nil end
GetCraftReagentItemLink = function() return nil end
GetCraftItemLink = function() return nil end

local containers = {
  [0] = { { 2447, "Peacebloom", 4 }, { 2449, "Earthroot", 2 } },
  [-1] = { { 2447, "Peacebloom", 8 } },
}
GetContainerNumSlots = function(bag) return containers[bag] and #containers[bag] or 0 end
GetContainerItemInfo = function(bag, slot)
  local x = containers[bag] and containers[bag][slot]
  if not x then return nil end
  return "icon", x[3], false, 1, false, false, link(x[1], x[2]), false, false, x[1]
end

local frames = {}
CreateFrame = function()
  local f = { events = {} }
  function f:SetScript(_, fn) self.handler = fn end
  function f:RegisterEvent(e) self.events[e] = true end
  frames[#frames + 1] = f
  return f
end
SlashCmdList = {}

if (arg[2] or "") == "no-currency-api" then C_CurrencyInfo = nil end
local chunk = assert(loadfile(arg[1]))
chunk("AzerothTracker")

local function fire(event, ...)
  for _, f in ipairs(frames) do
    if f.events[event] and f.handler then f.handler(f, event, ...) end
  end
end
local scenario = arg[2] or "default"
if scenario == "global-mismatch" then TRADE_SKILLS = "Trade Skills" end
if scenario == "cache-arrives" then uncachedReagent = true end

fire("ADDON_LOADED", "AzerothTracker")
fire("PLAYER_LOGIN")
fire("TRADE_SKILL_SHOW")
fire("BANKFRAME_OPENED")
fire("BAG_UPDATE", 0)
fire("BANKFRAME_CLOSED")

if scenario == "collapsed-professions" then
  -- player collapses "Professions" in the skill panel; Secondary Skills stays open
  skillLines = {
    { "Professions", true, false },
    { "Secondary Skills", true, true },
    { "Cooking", false, false, 51, 75 },
    { "Weapon Skills", true, true },
    { "Swords", false, false, 101, 120 },
  }
  fire("SKILL_LINES_CHANGED")
elseif scenario == "collapsed-currency" then
  -- player collapses the currency header: its rows are no longer listed
  currencyRows = { { name = "Forever", isHeader = true, isHeaderExpanded = false } }
  fire("CURRENCY_DISPLAY_UPDATE")
elseif scenario == "empty-currency-list" then
  -- the list is not filled in yet
  currencyRows = {}
  fire("CURRENCY_DISPLAY_UPDATE")
elseif scenario == "cache-arrives" then
  -- first open on a fresh client: one reagent not cached, then the item info arrives
  uncachedReagent = false
  fire("GET_ITEM_INFO_RECEIVED", 2449, true)
elseif scenario == "uncached-reagent" then
  -- reopening the window while one reagent item is not cached by the client
  uncachedReagent = true
  fire("TRADE_SKILL_UPDATE")
elseif scenario == "collapsed-recipes" then
  -- player collapses the "Potions" category in the profession window
  recipes = { { "Potions", "header" } }
  fire("TRADE_SKILL_UPDATE")
end

fire("PLAYER_LOGOUT")
SlashCmdList["AZEROTHTRACKER"]("")

-- Serializer in the style WoW uses for SavedVariables.
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

io.write("\nAzerothTrackerDB = ", serialize(AzerothTrackerDB, 0), "\n")
