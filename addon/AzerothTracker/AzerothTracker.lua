-- AzerothTracker: collects character, profession and inventory data into
-- AzerothTrackerDB (SavedVariables). The desktop app reads the file after
-- /reload, logout or character switch. Format: schemaVersion 1 (see docs/plans).

local ADDON_NAME = ...
local SCHEMA_VERSION = 1

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

-- Professions and their skill from the skill panel (primary + secondary).
local function updateProfessions()
  if not GetNumSkillLines or not GetSkillLineInfo then return end
  local wanted = {}
  if TRADE_SKILLS then wanted[stripColon(TRADE_SKILLS)] = true end
  if SECONDARY_SKILLS then wanted[stripColon(SECONDARY_SKILLS)] = true end

  local c = getChar()
  local found, sawExpandedHeader = {}, false
  local inWanted = false
  for i = 1, GetNumSkillLines() do
    local name, isHeader, isExpanded, rank, _, _, maxRank = GetSkillLineInfo(i)
    if isHeader then
      inWanted = wanted[stripColon(name)] or false
      if inWanted and isExpanded then sawExpandedHeader = true end
    elseif inWanted and name then
      local p = c.professions[name] or {}
      p.skill = rank or 0
      p.maxSkill = maxRank or 0
      found[name] = p
    end
  end
  -- Collapsed headers hide their rows; never wipe data because of that.
  if sawExpandedHeader then c.professions = found end
  c.updatedAt = now()
end

local function storeRecipes(profName, rank, maxRank, recipes)
  local c = getChar()
  local p = c.professions[profName] or {}
  if rank then p.skill = rank end
  if maxRank then p.maxSkill = maxRank end
  p.recipes = recipes
  p.scannedAt = now()
  c.professions[profName] = p
end

-- Regular professions (TradeSkill API). Note: active search/filters in the
-- profession window can hide recipes; open it without filters for a full scan.
local function scanTradeSkill()
  if not GetTradeSkillLine or not GetNumTradeSkills then return end
  local profName, rank, maxRank = GetTradeSkillLine()
  if not profName or profName == "UNKNOWN" then return end
  local recipes = {}
  for i = 1, GetNumTradeSkills() do
    local name, kind = GetTradeSkillInfo(i)
    if name and kind ~= "header" and kind ~= "subheader" then
      local reagents = {}
      for r = 1, (GetTradeSkillNumReagents(i) or 0) do
        local _, _, count = GetTradeSkillReagentInfo(i, r)
        local link = GetTradeSkillReagentItemLink and GetTradeSkillReagentItemLink(i, r)
        local id = itemIdFromLink(link)
        if id then
          rememberName(id, link)
          reagents[#reagents + 1] = { itemId = id, count = count or 1 }
        end
      end
      recipes[name] = { reagents = reagents }
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
  local recipes = {}
  for i = 1, GetNumCrafts() do
    local name, _, kind = GetCraftInfo(i)
    if name and kind ~= "header" then
      local reagents = {}
      for r = 1, (GetCraftNumReagents(i) or 0) do
        local _, _, count = GetCraftReagentInfo(i, r)
        local link = GetCraftReagentItemLink and GetCraftReagentItemLink(i, r)
        local id = itemIdFromLink(link)
        if id then
          rememberName(id, link)
          reagents[#reagents + 1] = { itemId = id, count = count or 1 }
        end
      end
      recipes[name] = { reagents = reagents }
    end
  end
  storeRecipes(profName, rank, maxRank, recipes)
end

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
  TRADE_SKILL_SHOW = scanTradeSkill,
  TRADE_SKILL_UPDATE = scanTradeSkill,
  CRAFT_SHOW = scanCraft,
  CRAFT_UPDATE = scanCraft,
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
  print(string.format("|cffe0b44cAzerothTracker|r: %d postav, %d profesí, %d receptů. Data se uloží po /reload.", chars, profs, recipes))
end
