-- AzerothTracker: collects character, profession and inventory data into
-- AzerothTrackerDB (SavedVariables). The desktop app reads the file after
-- /reload, logout or character switch. Format: schemaVersion 2 (see docs/specs).

local ADDON_NAME = ...
local SCHEMA_VERSION = 2

local db

local function now() return time() end

-- ---------------------------------------------------------------- helpers

local function itemIdFromLink(link)
  if not link then return nil end
  local id = string.match(link, "item:(%d+)")
  return id and tonumber(id) or nil
end

local function rememberName(id, link)
  if not id or not link then return end
  local name = string.match(link, "%[(.-)%]")
  if name and name ~= "" then db.itemNames[id] = name end
end

local function charKey()
  return (GetRealmName() or "?") .. "-" .. (UnitName("player") or "?")
end

local function getChar()
  local key = charKey()
  local c = db.characters[key]
  if not c then
    c = { professions = {} }
    db.characters[key] = c
  end
  c.professions = c.professions or {}
  return c
end

local function stripColon(s) return s and (string.gsub(s, ":$", "")) or s end

-- ------------------------------------------------------------ character

local function updateBasics()
  local c = getChar()
  c.name = UnitName("player")
  c.realm = GetRealmName()
  c.race = UnitRace("player")
  local _, classToken = UnitClass("player")
  c.class = classToken
  c.level = UnitLevel("player")
  c.updatedAt = now()
end

-- English profession names, used in addition to the header globals so a
-- differing header text never hides professions.
local KNOWN_PROFESSIONS = {
  Alchemy = true, Blacksmithing = true, Enchanting = true, Engineering = true,
  Herbalism = true, Leatherworking = true, Mining = true, Skinning = true,
  Tailoring = true, Jewelcrafting = true, Inscription = true,
  Cooking = true, ["First Aid"] = true, Fishing = true,
}

-- Professions and their skill from the skill panel (primary + secondary).
-- Rows under a collapsed header are invisible, so a profession is only removed
-- when every header is expanded and it is really gone (e.g. unlearned).
local function updateProfessions()
  if not GetNumSkillLines or not GetSkillLineInfo then return end
  local wanted = {}
  if TRADE_SKILLS then wanted[stripColon(TRADE_SKILLS)] = true end
  if SECONDARY_SKILLS then wanted[stripColon(SECONDARY_SKILLS)] = true end

  local c = getChar()
  local seen, allExpanded, inWanted = {}, true, false
  for i = 1, GetNumSkillLines() do
    local name, isHeader, isExpanded, rank, _, _, maxRank = GetSkillLineInfo(i)
    if isHeader then
      inWanted = wanted[stripColon(name)] or false
      if not isExpanded then allExpanded = false end
    elseif name and (inWanted or KNOWN_PROFESSIONS[name]) then
      local p = c.professions[name] or {}
      p.skill = rank or 0
      p.maxSkill = maxRank or 0
      c.professions[name] = p
      seen[name] = true
    end
  end
  if allExpanded then
    for name in pairs(c.professions) do
      if not seen[name] then c.professions[name] = nil end
    end
  end
  c.updatedAt = now()
end

local function storeRecipes(profName, rank, maxRank, recipes)
  local c = getChar()
  local p = c.professions[profName] or {}
  if rank then p.skill = rank end
  if maxRank then p.maxSkill = maxRank end
  -- Merge: collapsed categories or filters in the profession window hide
  -- recipes, so a scan only adds or updates, never removes.
  p.recipes = p.recipes or {}
  for key, recipe in pairs(recipes) do p.recipes[key] = recipe end
  p.scannedAt = now()
  c.professions[profName] = p
end

local DIFFICULTY = { optimal = "orange", medium = "yellow", easy = "green", trivial = "gray" }

local function spellIdFromLink(link)
  if not link then return nil end
  local id = string.match(link, "enchant:(%d+)") or string.match(link, "spell:(%d+)")
  return id and tonumber(id) or nil
end

-- Builds one recipe entry through the given API accessors. Returns nil when a
-- reagent's item link is not available yet (item not cached): the previous
-- entry is then kept and the next update retries.
local function readRecipe(api, i, name, kind)
  local reagents = {}
  for r = 1, (api.numReagents(i) or 0) do
    local _, _, count = api.reagentInfo(i, r)
    local link = api.reagentLink and api.reagentLink(i, r)
    local id = itemIdFromLink(link)
    if not id then return nil end
    rememberName(id, link)
    reagents[#reagents + 1] = { itemId = id, count = count or 1 }
  end
  local entry = { name = name, difficulty = DIFFICULTY[kind], reagents = reagents }
  entry.spellId = api.recipeLink and spellIdFromLink(api.recipeLink(i)) or nil
  local itemLink = api.itemLink and api.itemLink(i)
  local createdId = itemIdFromLink(itemLink)
  if createdId then
    entry.createdItemId = createdId
    rememberName(createdId, itemLink)
  end
  if api.numMade then entry.numMade = api.numMade(i) end
  return entry
end

local function recipeKey(entry)
  return entry.spellId and ("spell:" .. entry.spellId) or entry.name
end

-- Regular professions (TradeSkill API). Collapsed categories / filters only
-- limit what one scan sees; storeRecipes merges, so nothing is lost.
local function scanTradeSkill()
  if not GetTradeSkillLine or not GetNumTradeSkills then return end
  local profName, rank, maxRank = GetTradeSkillLine()
  if not profName or profName == "UNKNOWN" then return end
  local api = {
    numReagents = GetTradeSkillNumReagents,
    reagentInfo = GetTradeSkillReagentInfo,
    reagentLink = GetTradeSkillReagentItemLink,
    recipeLink = GetTradeSkillRecipeLink,
    itemLink = GetTradeSkillItemLink,
    numMade = GetTradeSkillNumMade,
  }
  local recipes = {}
  for i = 1, GetNumTradeSkills() do
    local name, kind = GetTradeSkillInfo(i)
    if name and kind ~= "header" and kind ~= "subheader" then
      local entry = readRecipe(api, i, name, kind)
      if entry then recipes[recipeKey(entry)] = entry end
    end
  end
  storeRecipes(profName, rank, maxRank, recipes)
end

-- Enchanting in Classic uses the Craft API (hunter Beast Training too, which
-- has no display skill line and is skipped).
local function scanCraft()
  if not GetCraftDisplaySkillLine or not GetNumCrafts then return end
  local profName, rank, maxRank = GetCraftDisplaySkillLine()
  if not profName then return end
  local api = {
    numReagents = GetCraftNumReagents,
    reagentInfo = GetCraftReagentInfo,
    reagentLink = GetCraftReagentItemLink,
    recipeLink = GetCraftRecipeLink or GetCraftItemLink,
  }
  local recipes = {}
  for i = 1, GetNumCrafts() do
    local name, _, kind = GetCraftInfo(i)
    if name and kind ~= "header" then
      local entry = readRecipe(api, i, name, kind)
      if entry then recipes[recipeKey(entry)] = entry end
    end
  end
  storeRecipes(profName, rank, maxRank, recipes)
end

-- Profession windows fire many update events (every craft, filter change);
-- coalesce them into at most one scan per 0.5 s.
local pendingScans = {}
local function throttled(scan)
  return function()
    if pendingScans[scan] then return end
    if not (C_Timer and C_Timer.After) then return scan() end
    pendingScans[scan] = true
    C_Timer.After(0.5, function()
      pendingScans[scan] = nil
      scan()
    end)
  end
end
local scanTradeSkillThrottled = throttled(scanTradeSkill)
local scanCraftThrottled = throttled(scanCraft)

-- ------------------------------------------------------------ inventory

local function numSlots(bag)
  if C_Container and C_Container.GetContainerNumSlots then return C_Container.GetContainerNumSlots(bag) or 0 end
  if GetContainerNumSlots then return GetContainerNumSlots(bag) or 0 end
  return 0
end

local function slotInfo(bag, slot)
  if C_Container and C_Container.GetContainerItemInfo then
    local info = C_Container.GetContainerItemInfo(bag, slot)
    if info then return info.itemID, info.stackCount, info.hyperlink end
    return nil
  end
  if GetContainerItemInfo then
    local _, count, _, _, _, _, link, _, _, id = GetContainerItemInfo(bag, slot)
    return id or itemIdFromLink(link), count, link
  end
end

local function scanContainers(bags)
  local items = {}
  for _, bag in ipairs(bags) do
    for slot = 1, numSlots(bag) do
      local id, count, link = slotInfo(bag, slot)
      if id then
        items[id] = (items[id] or 0) + (count or 1)
        rememberName(id, link)
      end
    end
  end
  return { seenAt = now(), items = items }
end

local NUM_BAGS = NUM_BAG_SLOTS or 4
local NUM_BANK_BAGS = NUM_BANKBAGSLOTS or 6

local function bagList()
  local list = {}
  for b = 0, NUM_BAGS do list[#list + 1] = b end
  return list
end

local function bankList()
  local list = { BANK_CONTAINER or -1 }
  for b = NUM_BAGS + 1, NUM_BAGS + NUM_BANK_BAGS do list[#list + 1] = b end
  return list
end

-- Account-wide bank, only if this client has one (Enum.BagIndex.AccountBankTab_*).
local function accountBankList()
  if not (Enum and Enum.BagIndex and Enum.BagIndex.AccountBankTab_1) then return nil end
  local list = {}
  for i = 1, 5 do
    local idx = Enum.BagIndex["AccountBankTab_" .. i]
    if idx then list[#list + 1] = idx end
  end
  return list
end

local bankOpen = false

local function scanBags() getChar().bags = scanContainers(bagList()) end

local function scanBank()
  if not bankOpen then return end
  getChar().bank = scanContainers(bankList())
  local account = accountBankList()
  if account then db.accountBank = scanContainers(account) end
end

-- --------------------------------------------------------------- events

local frame = CreateFrame("Frame")
local bagScanPending = false

local function scheduleBagScan()
  if bagScanPending then return end
  bagScanPending = true
  local run = function()
    bagScanPending = false
    scanBags()
    scanBank()
  end
  if C_Timer and C_Timer.After then C_Timer.After(1, run) else run() end
end

local handlers = {
  ADDON_LOADED = function(name)
    if name ~= ADDON_NAME then return end
    AzerothTrackerDB = AzerothTrackerDB or {}
    db = AzerothTrackerDB
    db.schemaVersion = SCHEMA_VERSION
    db.itemNames = db.itemNames or {}
    db.characters = db.characters or {}
  end,
  PLAYER_LOGIN = function()
    updateBasics()
    updateProfessions()
    scanBags()
  end,
  PLAYER_LEVEL_UP = updateBasics,
  SKILL_LINES_CHANGED = updateProfessions,
  TRADE_SKILL_SHOW = scanTradeSkillThrottled,
  TRADE_SKILL_UPDATE = scanTradeSkillThrottled,
  CRAFT_SHOW = scanCraftThrottled,
  CRAFT_UPDATE = scanCraftThrottled,
  BAG_UPDATE = scheduleBagScan,
  BAG_UPDATE_DELAYED = scheduleBagScan,
  BANKFRAME_OPENED = function()
    bankOpen = true
    scanBank()
  end,
  BANKFRAME_CLOSED = function() bankOpen = false end,
  PLAYERBANKSLOTS_CHANGED = scanBank,
  PLAYER_LOGOUT = function()
    updateBasics()
    scanBags()
  end,
}

frame:SetScript("OnEvent", function(_, event, ...)
  if not db and event ~= "ADDON_LOADED" then return end
  local handler = handlers[event]
  if handler then handler(...) end
end)

for event in pairs(handlers) do
  -- Some events may not exist in every client; ignore those.
  pcall(frame.RegisterEvent, frame, event)
end

-- ---------------------------------------------------------- slash command

SLASH_AZEROTHTRACKER1 = "/azeroth"
SLASH_AZEROTHTRACKER2 = "/at"
SlashCmdList["AZEROTHTRACKER"] = function()
  local chars, profs, recipes = 0, 0, 0
  for _, c in pairs(db.characters) do
    chars = chars + 1
    for _, p in pairs(c.professions or {}) do
      profs = profs + 1
      for _ in pairs(p.recipes or {}) do recipes = recipes + 1 end
    end
  end
  print(string.format("|cffe0b44cAzerothTracker|r: %d characters, %d professions, %d recipes. Data is saved on /reload.", chars, profs, recipes))
end
