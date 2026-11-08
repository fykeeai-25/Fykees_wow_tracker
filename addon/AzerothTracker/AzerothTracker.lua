-- AzerothTracker: collects character, profession and inventory data into
-- AzerothTrackerDB (SavedVariables). The desktop app reads the file after
-- /reload, logout or character switch. Format: schemaVersion 3 (see docs/specs).

local ADDON_NAME = ...
local SCHEMA_VERSION = 3
local ADDON_VERSION = "0.1.1"

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

local function updateMoney()
  if not GetMoney then return end
  local c = getChar()
  c.money = GetMoney()
  c.moneyAt = now()
end

-- Currencies (e.g. Merchant's Favor), only if this client has the currency API.
-- Rows under a collapsed header are not listed, so visible rows are merged in and a
-- currency is removed only when every header is expanded; an empty list changes nothing.
local function updateCurrencies()
  if not (C_CurrencyInfo and C_CurrencyInfo.GetCurrencyListSize and C_CurrencyInfo.GetCurrencyListInfo) then return end
  local size = C_CurrencyInfo.GetCurrencyListSize() or 0
  if size == 0 then return end
  local c = getChar()
  local list = c.currencies or {}
  local seen, allExpanded = {}, true
  for i = 1, size do
    local info = C_CurrencyInfo.GetCurrencyListInfo(i)
    if info and info.isHeader then
      if info.isHeaderExpanded == false then allExpanded = false end
    elseif info and info.name then
      list[info.name] = { id = info.currencyTypesID or info.currencyID, count = info.quantity or 0 }
      seen[info.name] = true
    end
  end
  if allExpanded then
    for name in pairs(list) do
      if not seen[name] then list[name] = nil end
    end
  end
  c.currencies = list
end

-- ------------------------------------------------------------ diagnostics
-- Which WoW API functions this client has (alternatives separated by "|": any one is enough).
-- Written on login so the app can show what works on WoW: Forever.
local REQUIRED_APIS = {
  "GetMoney", "GetRealmName", "UnitName", "UnitRace", "UnitClass", "UnitLevel", "GetBuildInfo",
  "GetNumSkillLines", "GetSkillLineInfo",
  "GetTradeSkillLine", "GetNumTradeSkills", "GetTradeSkillInfo", "GetTradeSkillNumReagents",
  "GetTradeSkillReagentInfo", "GetTradeSkillReagentItemLink", "GetTradeSkillRecipeLink",
  "GetTradeSkillItemLink", "GetTradeSkillNumMade",
  "GetCraftDisplaySkillLine", "GetNumCrafts", "GetCraftInfo", "GetCraftNumReagents",
  "GetCraftReagentInfo", "GetCraftReagentItemLink", "GetCraftRecipeLink|GetCraftItemLink",
  "C_Container.GetContainerNumSlots|GetContainerNumSlots",
  "C_Container.GetContainerItemInfo|GetContainerItemInfo",
  "C_CurrencyInfo.GetCurrencyListSize", "C_CurrencyInfo.GetCurrencyListInfo",
}

local function apiExists(path)
  local t = _G
  for part in string.gmatch(path, "[^%.]+") do
    if type(t) ~= "table" then return false end
    t = t[part]
  end
  return t ~= nil
end

local function updateDiagnostics()
  local build, buildNumber, _, interface = GetBuildInfo()
  local missing = {}
  for _, entry in ipairs(REQUIRED_APIS) do
    local found, first = false, nil
    for alt in string.gmatch(entry, "[^|]+") do
      first = first or alt
      if apiExists(alt) then found = true end
    end
    if not found then missing[#missing + 1] = first end
  end
  local legacy = {}
  for name in pairs(_G) do
    if type(name) == "string" and string.find(name, "Legacy") then legacy[#legacy + 1] = name end
  end
  table.sort(legacy)
  db.diagnostics = {
    build = build, buildNumber = buildNumber, interface = interface,
    addonVersion = ADDON_VERSION, checkedAt = now(),
    missing = missing, legacyApis = legacy,
  }
end

-- ---------------------------------------------------------------- API probe
-- Discovery for clients whose profession API differs from Classic (WoW: Forever
-- 1.60 has none of the GetTradeSkill*/GetCraft*/GetSkillLine* functions).
-- Saved to AzerothTrackerDB.probe for reading by hand; the app ignores it.
-- Everything runs under pcall so the probe can never break data collection.

local PROBE_PATTERNS = { "TradeSkill", "Profession", "SkillLine", "Craft", "Recipe" }
local PROBE_NAMESPACES = { C_SpellBook = true, C_Spell = true, C_Item = true }
local PROBE_EVENTS = {
  "TRADE_SKILL_SHOW", "TRADE_SKILL_CLOSE", "TRADE_SKILL_UPDATE", "TRADE_SKILL_LIST_UPDATE",
  "TRADE_SKILL_DATA_SOURCE_CHANGING", "TRADE_SKILL_DATA_SOURCE_CHANGED", "TRADE_SKILL_NAME_UPDATE",
  "CRAFT_SHOW", "CRAFT_UPDATE", "SKILL_LINES_CHANGED", "SKILL_LINE_SPECS_RANKS_CHANGED",
  "NEW_RECIPE_LEARNED", "LEARNED_SPELL_IN_TAB", "SPELLS_CHANGED",
}
local PROBE_LIST_MAX = 400

local function probeMatches(name)
  for _, pat in ipairs(PROBE_PATTERNS) do
    if string.find(name, pat, 1, true) then return true end
  end
  return false
end

-- Plain copy of a value that SavedVariables can hold: bounded depth and size.
local function summarize(v, depth)
  local t = type(v)
  if t == "string" or t == "number" or t == "boolean" then return v end
  if t ~= "table" then return t end
  if depth >= 3 then return "table" end
  local out, n = {}, 0
  for k, x in pairs(v) do
    if type(k) == "string" or type(k) == "number" then
      out[k] = summarize(x, depth + 1)
      n = n + 1
      if n >= 40 then out["..."] = "truncated" break end
    end
  end
  return out
end

-- Results of fn(...) as a list; a missing value is the string "nil" so positions are kept.
local function probeCall(calls, label, fn, ...)
  if type(fn) ~= "function" then return nil end
  local res = { pcall(fn, ...) }
  if not res[1] then
    calls[label] = { "error: " .. tostring(res[2]) }
    return nil
  end
  local out, last = {}, 1
  for i = 2, table.maxn(res) do last = i end
  for i = 2, last do
    if res[i] == nil then out[i - 1] = "nil" else out[i - 1] = summarize(res[i], 0) end
  end
  calls[label] = out
  return unpack(res, 2, last)
end

local function probeApi(label)
  local p = db.probe
  local calls = {}
  local function call(name, fn, ...) return probeCall(calls, name, fn, ...) end

  local idx = { call("GetProfessions()", GetProfessions) }
  for i = 1, 5 do
    if type(idx[i]) == "number" then call("GetProfessionInfo(" .. idx[i] .. ")", GetProfessionInfo, idx[i]) end
  end
  local T = C_TradeSkillUI
  if type(T) == "table" then
    call("C_TradeSkillUI.IsTradeSkillReady()", T.IsTradeSkillReady)
    call("C_TradeSkillUI.GetTradeSkillLine()", T.GetTradeSkillLine)
    call("C_TradeSkillUI.GetBaseProfessionInfo()", T.GetBaseProfessionInfo)
    call("C_TradeSkillUI.GetChildProfessionInfo()", T.GetChildProfessionInfo)
    call("C_TradeSkillUI.GetCategories()", T.GetCategories)
    local ids = call("C_TradeSkillUI.GetAllRecipeIDs()", T.GetAllRecipeIDs)
    local first = type(ids) == "table" and ids[1] or nil
    if first then
      local a = "(" .. tostring(first) .. ")"
      call("C_TradeSkillUI.GetRecipeInfo" .. a, T.GetRecipeInfo, first)
      call("C_TradeSkillUI.GetRecipeSchematic" .. a, T.GetRecipeSchematic, first, false)
      call("C_TradeSkillUI.GetRecipeNumReagents" .. a, T.GetRecipeNumReagents, first)
      call("C_TradeSkillUI.GetRecipeReagentInfo" .. a, T.GetRecipeReagentInfo, first, 1)
      call("C_TradeSkillUI.GetRecipeReagentItemLink" .. a, T.GetRecipeReagentItemLink, first, 1)
      call("C_TradeSkillUI.GetRecipeItemLink" .. a, T.GetRecipeItemLink, first)
      call("C_TradeSkillUI.GetRecipeLink" .. a, T.GetRecipeLink, first)
      call("C_TradeSkillUI.GetRecipeNumItemsProduced" .. a, T.GetRecipeNumItemsProduced, first)
    end
  end
  p.calls[label] = calls
end

local function probeGlobals()
  local p = db.probe
  local globals, namespaces = {}, {}
  for name, v in pairs(_G) do
    if type(name) == "string" and (type(v) == "function" or type(v) == "table") then
      local isNs = type(v) == "table" and string.sub(name, 1, 2) == "C_"
      if probeMatches(name) or (isNs and PROBE_NAMESPACES[name]) then
        if #globals < PROBE_LIST_MAX then globals[#globals + 1] = name end
        if isNs then
          local fns = {}
          for k, f in pairs(v) do
            if type(k) == "string" and type(f) == "function" then fns[#fns + 1] = k end
          end
          table.sort(fns)
          namespaces[name] = fns
        end
      end
    end
  end
  table.sort(globals)
  p.globals, p.namespaces = globals, namespaces
end

local function runProbe(label)
  db.probe = db.probe or {}
  local p = db.probe
  p.events = p.events or {}
  p.calls = p.calls or {}
  p.checkedAt = now()
  pcall(probeGlobals)
  pcall(probeApi, label)
end

local function probeEvent(event)
  if not db then return end
  db.probe = db.probe or {}
  db.probe.events = db.probe.events or {}
  db.probe.events[event] = (db.probe.events[event] or 0) + 1
  runProbe(event)
end

-- Professions and their skill from the skill panel (primary + secondary).
-- Rows under a collapsed header are invisible, so a profession is only removed
-- when every header is expanded and it is really gone (e.g. unlearned).
-- Modern clients (WoW: Forever 1.60) have no skill panel API; GetProfessions
-- returns the indices of up to six professions (holes are nil).
local function updateModernProfessions()
  if not GetProfessions or not GetProfessionInfo then return end
  local idx = { GetProfessions() }
  local c = getChar()
  local seen, any = {}, false
  for i = 1, 6 do
    if type(idx[i]) == "number" then
      local name, _, rank, maxRank = GetProfessionInfo(idx[i])
      if name and name ~= "" then
        local p = c.professions[name] or {}
        p.skill = rank or 0
        p.maxSkill = maxRank or 0
        c.professions[name] = p
        seen[name] = true
        any = true
      end
    end
  end
  -- An empty answer may just mean "not loaded yet": never wipe on it.
  if any then
    for name in pairs(c.professions) do
      if not seen[name] then c.professions[name] = nil end
    end
  end
  c.updatedAt = now()
end

local function updateProfessions()
  if not GetNumSkillLines or not GetSkillLineInfo then return updateModernProfessions() end
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

local function rememberNameById(id)
  if db.itemNames[id] then return end
  local name = C_Item and C_Item.GetItemNameByID and C_Item.GetItemNameByID(id)
  if not name and GetItemInfo then name = GetItemInfo(id) end
  if name and name ~= "" then db.itemNames[id] = name end
end

-- relativeDifficulty of the modern recipe API: 0 optimal … 3 trivial
local MODERN_DIFFICULTY = { [0] = "orange", [1] = "yellow", [2] = "green", [3] = "gray" }

local function readModernRecipe(T, id, info)
  local entry = { name = info.name, spellId = id, difficulty = MODERN_DIFFICULTY[info.relativeDifficulty], reagents = {} }
  local schematic = T.GetRecipeSchematic and T.GetRecipeSchematic(id, false)
  if type(schematic) == "table" then
    local basic = Enum and Enum.CraftingReagentType and Enum.CraftingReagentType.Basic or 1
    for _, slot in ipairs(schematic.reagentSlotSchematics or {}) do
      -- only the required base reagents are the recipe's cost; optional and
      -- finishing reagents are choices, not requirements
      local isBasic = slot.reagentType == nil or slot.reagentType == basic
      local reagent = slot.reagents and slot.reagents[1]
      if isBasic and slot.required ~= false and reagent and reagent.itemID then
        entry.reagents[#entry.reagents + 1] = { itemId = reagent.itemID, count = slot.quantityRequired or 1 }
        rememberNameById(reagent.itemID)
      end
    end
    if schematic.outputItemID and schematic.outputItemID > 0 then
      entry.createdItemId = schematic.outputItemID
      rememberNameById(schematic.outputItemID)
    end
    if schematic.quantityMin then entry.numMade = schematic.quantityMin end
  end
  return entry
end

-- Modern profession window (C_TradeSkillUI). Only the player's own window:
-- linked, guild and NPC crafting windows show other people's recipes.
local function scanModernTradeSkill()
  local T = C_TradeSkillUI
  if not (T and T.GetAllRecipeIDs and T.GetRecipeInfo and T.GetBaseProfessionInfo) then return end
  if T.IsTradeSkillReady and not T.IsTradeSkillReady() then return end
  if (T.IsTradeSkillLinked and T.IsTradeSkillLinked())
    or (T.IsTradeSkillGuild and T.IsTradeSkillGuild())
    or (T.IsNPCCrafting and T.IsNPCCrafting()) then return end
  local base = T.GetBaseProfessionInfo()
  local profName = type(base) == "table" and base.professionName
  if not profName or profName == "" then return end
  local rank = base.skillLevel
  local maxRank = base.maxSkillLevel
  if not rank or rank == 0 then rank, maxRank = nil, nil end -- keep the GetProfessions value
  local recipes = {}
  for _, id in ipairs(T.GetAllRecipeIDs() or {}) do
    local info = T.GetRecipeInfo(id)
    if type(info) == "table" and info.learned and info.name then
      local entry = readModernRecipe(T, id, info)
      recipes[recipeKey(entry)] = entry
    end
  end
  if next(recipes) then storeRecipes(profName, rank, maxRank, recipes) end
end

-- Regular professions (TradeSkill API). Collapsed categories / filters only
-- limit what one scan sees; storeRecipes merges, so nothing is lost.
local function scanTradeSkill()
  if not GetTradeSkillLine or not GetNumTradeSkills then return scanModernTradeSkill() end
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

-- On a fresh client many reagent items are not cached yet; when their info
-- arrives, rescan the open profession window so skipped recipes get stored.
local tradeOpen, craftOpen = false, false
local function onItemInfo()
  if tradeOpen then scanTradeSkillThrottled() end
  if craftOpen then scanCraftThrottled() end
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

-- ------------------------------------------------------------ dungeon runs
-- A run starts when the character enters a dungeon or raid and ends when it leaves.
-- Loot is the difference of the bags between start and end, because loot chat text
-- may be hidden from addons inside instances. Only the player's own character:
-- no combat log, nothing about other players.

local MAX_RUNS = 200
local REOPEN_WITHIN = 15 * 60 -- back in the same dungeon within 15 min = same run
local RUN_TYPES = { party = true, raid = true }

-- Values the client hides from addons become nil.
local function plain(v)
  if issecretvalue and issecretvalue(v) then return nil end
  return v
end

local function xpNow() return UnitXP and plain(UnitXP("player")) or 0 end
local function xpMaxNow() return UnitXPMax and plain(UnitXPMax("player")) or 0 end
local function bagItems() return scanContainers(bagList()).items end

local function currentInstance()
  if not (IsInInstance and GetInstanceInfo) then return nil end
  local inside, kind = IsInInstance()
  if not inside or not RUN_TYPES[kind] then return nil end
  local name, _, _, difficultyName = GetInstanceInfo()
  name, difficultyName = plain(name), plain(difficultyName)
  if type(name) ~= "string" or name == "" then return nil end
  if type(difficultyName) ~= "string" or difficultyName == "" then difficultyName = nil end
  return { name = name, difficulty = difficultyName }
end

-- XP since the last mark; a level-up in between counts the rest of the old level.
local function addXp(run)
  local cur, max = xpNow() or 0, xpMaxNow() or 0
  if cur >= run.xpMark then
    run.xp = run.xp + (cur - run.xpMark)
  else
    run.xp = run.xp + math.max(0, run.xpMaxMark - run.xpMark) + cur
  end
  run.xpMark, run.xpMaxMark = cur, max
end

local function startRun(c, inst)
  c.activeRun = {
    dungeon = inst.name, difficulty = inst.difficulty,
    startedAt = now(), lastSeenAt = now(), level = UnitLevel("player"),
    xp = 0, xpMark = xpNow() or 0, xpMaxMark = xpMaxNow() or 0,
    moneyStart = GetMoney and GetMoney() or 0, bagsStart = bagItems(),
    deaths = 0, bosses = {},
  }
end

local function finishRun(c, endedAt)
  local run = c.activeRun
  if not run then return end
  addXp(run)
  local loot, bags = {}, bagItems()
  for id, n in pairs(bags) do
    local gained = n - (run.bagsStart[id] or 0)
    if gained > 0 then loot[#loot + 1] = { itemId = id, count = gained } end
  end
  table.sort(loot, function(a, b) return a.itemId < b.itemId end)
  c.runs = c.runs or {}
  c.runs[#c.runs + 1] = {
    dungeon = run.dungeon, difficulty = run.difficulty,
    startedAt = run.startedAt, endedAt = endedAt, level = run.level,
    xp = run.xp, money = (GetMoney and GetMoney() or 0) - run.moneyStart,
    deaths = run.deaths, bosses = run.bosses, loot = loot, completed = run.completed,
  }
  while #c.runs > MAX_RUNS do table.remove(c.runs, 1) end
  -- kept so a quick trip out (hearth, sell, summon back) can resume this run
  run.endedAt = endedAt
  run.resume = nil
  c.lastRun = run
  c.activeRun = nil
end

-- Back in the same dungeon soon after leaving: resume the run. It may also be a
-- fresh instance after a reset; that only shows once a boss dies a second time,
-- so remember the finished entry and where the resumed part starts.
local function reopenRun(c)
  local run = c.lastRun
  c.lastRun = nil
  local last = c.runs and c.runs[#c.runs]
  local record
  if last and last.startedAt == run.startedAt then record = table.remove(c.runs) end
  run.endedAt = nil
  run.xpMark, run.xpMaxMark = xpNow() or 0, xpMaxNow() or 0
  run.lastSeenAt = now()
  run.resume = {
    record = record, at = now(), bags = bagItems(), money = GetMoney and GetMoney() or 0,
    xp = run.xp, deaths = run.deaths, bosses = #run.bosses,
  }
  c.activeRun = run
end

-- A boss from before the trip out died again: it was a new instance. Put the first
-- run back as it was and continue with a new run from the moment of coming back.
local function splitRun(c, run)
  local r = run.resume
  c.runs = c.runs or {}
  if r.record then c.runs[#c.runs + 1] = r.record end
  local bosses = {}
  for i = r.bosses + 1, #run.bosses do bosses[#bosses + 1] = run.bosses[i] end
  c.activeRun = {
    dungeon = run.dungeon, difficulty = run.difficulty,
    startedAt = r.at, lastSeenAt = now(), level = UnitLevel("player"),
    xp = run.xp - r.xp, xpMark = run.xpMark, xpMaxMark = run.xpMaxMark,
    moneyStart = r.money, bagsStart = r.bags,
    deaths = run.deaths - r.deaths, bosses = bosses,
  }
  return c.activeRun
end

-- Called whenever the character may have entered or left an instance.
local function checkInstance()
  local c = getChar()
  local inst = currentInstance()
  local run = c.activeRun
  if run then
    if inst and inst.name == run.dungeon then
      run.lastSeenAt = now()
      return
    end
    -- a released ghost appears outside at the graveyard: the run goes on
    if not inst and UnitIsDeadOrGhost and UnitIsDeadOrGhost("player") then return end
    -- logged out inside and came back elsewhere: it ended when last seen
    local endedAt = run.loggedOut and run.lastSeenAt or now()
    finishRun(c, endedAt)
  end
  if inst then
    local last = c.lastRun
    if last and last.dungeon == inst.name and last.difficulty == inst.difficulty
      and now() - (last.endedAt or 0) <= REOPEN_WITHIN then
      reopenRun(c)
    else
      c.lastRun = nil
      startRun(c, inst)
    end
  end
end

local function runEvent(fn)
  return function(...)
    local run = db and getChar().activeRun
    if run then
      fn(run, ...)
      run.lastSeenAt = now()
    end
  end
end

local onRunXp = runEvent(function(run) addXp(run) end)
local onRunDeath = runEvent(function(run) run.deaths = run.deaths + 1 end)
local onRunEncounter = runEvent(function(run, encounterId, encounterName, _, _, success)
  if plain(success) ~= 1 then return end
  local name = plain(encounterName)
  if type(name) ~= "string" or name == "" then name = "Boss " .. tostring(plain(encounterId) or "?") end
  if run.resume then
    for i = 1, run.resume.bosses do
      if run.bosses[i] == name then
        run = splitRun(getChar(), run)
        break
      end
    end
  end
  run.bosses[#run.bosses + 1] = name
end)
local onRunCompleted = runEvent(function(run) run.completed = true end)
local onRunLogout = runEvent(function(run)
  addXp(run)
  run.loggedOut = true
end)

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
    updateDiagnostics()
    db.probe = nil -- fresh probe each session
    runProbe("PLAYER_LOGIN")
    updateBasics()
    updateProfessions()
    updateMoney()
    updateCurrencies()
    scanBags()
  end,
  PLAYER_MONEY = updateMoney,
  PLAYER_ENTERING_WORLD = function()
    checkInstance()
    -- logout also fires on /reload: once back in the same dungeon the run is live again
    local run = getChar().activeRun
    if run then run.loggedOut = nil end
  end,
  ZONE_CHANGED_NEW_AREA = checkInstance,
  PLAYER_ALIVE = checkInstance,
  PLAYER_UNGHOST = checkInstance,
  PLAYER_XP_UPDATE = onRunXp,
  PLAYER_DEAD = onRunDeath,
  ENCOUNTER_END = onRunEncounter,
  LFG_COMPLETION_REWARD = onRunCompleted,
  CURRENCY_DISPLAY_UPDATE = updateCurrencies,
  PLAYER_LEVEL_UP = updateBasics,
  SKILL_LINES_CHANGED = updateProfessions,
  TRADE_SKILL_SHOW = function()
    tradeOpen = true
    scanTradeSkillThrottled()
  end,
  TRADE_SKILL_UPDATE = scanTradeSkillThrottled,
  -- modern clients: the recipe list is ready only after these
  TRADE_SKILL_LIST_UPDATE = function()
    tradeOpen = true
    scanTradeSkillThrottled()
  end,
  TRADE_SKILL_DATA_SOURCE_CHANGED = function()
    tradeOpen = true
    scanTradeSkillThrottled()
  end,
  TRADE_SKILL_CLOSE = function() tradeOpen = false end,
  CRAFT_SHOW = function()
    craftOpen = true
    scanCraftThrottled()
  end,
  CRAFT_UPDATE = scanCraftThrottled,
  CRAFT_CLOSE = function() craftOpen = false end,
  GET_ITEM_INFO_RECEIVED = onItemInfo,
  BAG_UPDATE = scheduleBagScan,
  BAG_UPDATE_DELAYED = scheduleBagScan,
  BANKFRAME_OPENED = function()
    bankOpen = true
    scanBank()
  end,
  BANKFRAME_CLOSED = function() bankOpen = false end,
  PLAYERBANKSLOTS_CHANGED = scanBank,
  PLAYER_LOGOUT = function()
    onRunLogout()
    updateBasics()
    updateMoney()
    updateCurrencies()
    scanBags()
  end,
}

local probeEvents = {}
for _, e in ipairs(PROBE_EVENTS) do probeEvents[e] = true end

frame:SetScript("OnEvent", function(_, event, ...)
  if not db and event ~= "ADDON_LOADED" then return end
  local handler = handlers[event]
  if handler then handler(...) end
  if probeEvents[event] then pcall(probeEvent, event) end
end)

for event in pairs(handlers) do
  -- Some events may not exist in every client; ignore those.
  pcall(frame.RegisterEvent, frame, event)
end
for event in pairs(probeEvents) do pcall(frame.RegisterEvent, frame, event) end

-- ---------------------------------------------------------- slash command

SLASH_AZEROTHTRACKER1 = "/azeroth"
SLASH_AZEROTHTRACKER2 = "/at"
local function printDiagnostics()
  updateDiagnostics()
  runProbe("debug")
  local d = db.diagnostics
  print(string.format("|cffe0b44cAzerothTracker|r %s – client %s (build %s, interface %s)", ADDON_VERSION, tostring(d.build), tostring(d.buildNumber), tostring(d.interface)))
  print("  Missing APIs: " .. (#d.missing > 0 and table.concat(d.missing, ", ") or "none"))
  print("  Legacy APIs: " .. (#d.legacyApis > 0 and table.concat(d.legacyApis, ", ") or "none found"))
  print("  Profession API probe saved – open a profession window, then /reload and send the SavedVariables file.")
end

SlashCmdList["AZEROTHTRACKER"] = function(msg)
  -- also reads an open profession window, in case its events were missed
  pcall(scanTradeSkill)
  if msg and string.lower(msg) == "debug" then return printDiagnostics() end
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
