#!/usr/bin/env sh

[ ! -d data ] && mkdir data
[ ! -d data/factbook.json ] && git clone https://github.com/factbook/factbook.json data/factbook.json
[ ! -d data/countries.json ] && fd ".*\.json" data/factbook.json \
	| while read f; do jq "{data:.,code:\"$(basename $f .json)\"}" $f; done \
	| jq -s '
	[.[]
	| .data.Government["Country name"]["conventional short form"].text as $name
	| .data.Government.Capital.name.text as $capital
	| select(
		$name != null
		and $name != "none"
		and $name != "Baker Island, Howland Island, Jarvis Island, Johnston Atoll, Kingman Reef, Midway Islands, Palmyra Atoll"
		and $name != "Dhekelia"
		and $name != "Akrotiri"
	)
	| {
		capitals: (
			if $capital and ($capital | startswith("no official") | not) then
				$capital
				| sub("(; note.*|is the.*|; located in.*|in Romanian.*| \\(Kiev.*?\\)| \\(.*?continues.*?\\)| \\(city\\)| \\(on.*?\\)| \\(located on.*?\\))"; ""; "g")
				| sub("Washington, DC"; "Washington DC")
				| sub("; "; ", "; "g")
				| split(",(?=[^\\)]*(?:\\(|$))"; "g")
			else [] end | map(sub("^ *| *$"; ""; "g"))
		),
		name: $name | sub(" \\(.*\\)"; ""; "g"),
		code,
		flag: "https://www.cia.gov/the-world-factbook/static/flags/\(.code | ascii_upcase)-flag.jpg"
	}] as $countries
	| {
		countries: $countries,
		withCapitals: [$countries | to_entries.[] | if .value.capitals | length > 0 then .key else empty end]
	}' >data/countries.json
