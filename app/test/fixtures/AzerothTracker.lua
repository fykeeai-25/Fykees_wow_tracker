
AzerothTrackerDB = {
	["schemaVersion"] = 3,
	["diagnostics"] = {
		["build"] = "1.60.1",
		["buildNumber"] = "70058",
		["interface"] = 11600,
		["addonVersion"] = "0.1.0",
		["checkedAt"] = 1761980000,
		["missing"] = {
			"GetCraftRecipeLink", -- [1]
		},
		["legacyApis"] = {
		},
	},
	["itemNames"] = {
		[2447] = "Peacebloom",
		[2449] = "Earthroot",
	},
	["accountBank"] = {
		["seenAt"] = 1761980000,
		["items"] = {
			[2447] = 20,
		},
	},
	["characters"] = {
		["Firemaw-Thrall"] = {
			["name"] = "Thrall",
			["realm"] = "Firemaw",
			["race"] = "Orc",
			["class"] = "SHAMAN",
			["level"] = 24,
			["updatedAt"] = 1761980000,
			["money"] = 123456,
			["moneyAt"] = 1761980000,
			["currencies"] = {
				["Merchant's Favor"] = {
					["id"] = 3101,
					["count"] = 7,
				},
			},
			["professions"] = {
				["Alchemy"] = {
					["skill"] = 142,
					["maxSkill"] = 150,
					["scannedAt"] = 1761980000,
					["recipes"] = {
						["spell:2330"] = {
							["spellId"] = 2330,
							["name"] = "Minor Healing Potion",
							["createdItemId"] = 118,
							["numMade"] = 1,
							["difficulty"] = "gray",
							["reagents"] = {
								{
									["itemId"] = 2447,
									["count"] = 1,
								}, -- [1]
								{
									["itemId"] = 2449,
									["count"] = 1,
								}, -- [2]
							},
						},
					},
				},
				["Herbalism"] = {
					["skill"] = 160,
					["maxSkill"] = 225,
				},
			},
			["bags"] = {
				["seenAt"] = 1761980000,
				["items"] = {
					[2447] = 4,
				},
			},
			["bank"] = {
				["seenAt"] = 1761634400,
				["items"] = {
					[2447] = 8,
				},
			},
		},
		["Firemaw-Jaina"] = {
			["name"] = "Jaina",
			["realm"] = "Firemaw",
			["race"] = "Human",
			["class"] = "MAGE",
			["level"] = 10,
			["updatedAt"] = 1761900000,
			["money"] = 5000,
			["moneyAt"] = 1761900000,
			["professions"] = {
			},
			["bags"] = {
				["seenAt"] = 1761900000,
				["items"] = {
					[2449] = 3,
				},
			},
		},
	},
}
