#!/usr/bin/env sh

process() {
	fd ".*\.json" data/factbook.json \
		| while read f; do jq "{data:.,code:\"$(basename $f .json)\"}" $f; done \
		| jq -s '
		[.[]
		| .data.Government["Country name"]["conventional short form"].text as $name
		| .data.Government.Capital.name.text as $capital
		| .data.Government["Administrative divisions"].text as $divisions
		| .data["People and Society"].Population.total.text as $population
		| .data.Geography["Land boundaries"]["border countries"].text as $borderCountries
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
			name: $name | sub(" \\(.*\\)"; ""; "g") | sub("&nbsp;$"; ""; "g"),
			code,
			borderCountries: $borderCountries,
			population: ($population // "unknown"),
			divisions: (
				if $divisions and ($divisions | contains("none") | not) then
					if .code == "fo" then
						$divisions | sub("^.* kommuna\\) "; "") | split(", ")
					elif .code == "wf" then
						$divisions | sub("^.* circonscription\\) "; "") | split(", ")
					elif .code == "nc" then
						$divisions
						| sub("^.*?; "; "")
						| split(",( and)? "; "g")
					elif .code == "my" then
						$divisions | split("; ") as $divisions
						| ($divisions[1] | split(", ") + ["Wilayah Persekutuan", "Kuala Lumpur", "Labuan", "Putrajaya"])
					elif .code == "bk" then
						$divisions
						| sub("; note ?- .*$"; "")
						| sub("^.*(- (?=[^\\)]*(?:\\(|$)))"; "")
						| split(", (?=[^\\)]*(?:\\(|$))"; "g")
					elif .code == "mk" then
						$divisions
						| sub("; note ?- .*$"; "")
						| sub("^.*([;:] (?=[^\\)]*(?:\\(|$)))"; "")
						| split(", (?=[^\\)]*(?:\\(|$))"; "g")
						| map(sub("^and |\\.$"; ""; "g"))
					elif .code == "be" then
						$divisions | sub("^.* gewest\\); "; "") | split("; ") | map(sub(", also known as .*"; ""))
					elif .code == "en" then
						$divisions
						| sub("^.*<strong>urban municipalities:</strong> "; "")
						| sub("<br><br><strong>rural municipalities:</strong>"; ",")
						| split(", ")
					elif .code == "uk" then
						$divisions
						| sub("<p><strong>(England|Scotland|Wales|Northern Ireland):</strong>.*?</p>"; ""; "g")
						| sub(" *<p><strong>.*?</strong> (?<list>.*?)</p> *"; "\(.list)SEPARATOR"; "g")
						| sub("SEPARATOR$"; "")
						| split("SEPARATOR") as $lists
						| (
							($lists[0] | split(", "))
							+ ($lists[1] | split(", "))
							+ ($lists[2] | split(", "))
							+ ($lists[3] | split("; "))
							+ ($lists[4] | split("; "))
							+ ($lists[5] | split("; "))
							+ ($lists[6] | split("; "))
							+ ($lists[7] | split(", "))
							+ ($lists[8] | split(", "))
						)
					elif .code == "gg" then
						$divisions
						| sub("^<p>.*?</p>"; "")
						| sub("; note - .* Mtskheta-Mtianeti"; "")
						| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
						| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
						| sub("(, *)+$"; "")
						| split(", ")
						| map(sub("^ +| +$"; ""; "g"))
					elif .code == "ch" then
						$divisions
						| sub("^<p>.*?</p>"; "")
						| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
						| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
						| sub("<br><br>"; ", "; "g")
						| sub("(, *)+$"; "")
						| split(", ")
						| map(sub("^ +| +$|; \\(see note on Taiwan\\)"; ""; "g"))
					elif .code == "uz" then
						$divisions
						| sub("^.*shahar\\); |  </p>$"; ""; "g")
						| split(", ")
					elif $divisions | contains("<strong>") then
						$divisions
						| sub("^<p>.*?</p>"; "")
						| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
						| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
						| sub("(, *)+$"; "")
						| split(", ")
						| map(sub("^ +| +$"; ""; "g"))
					else
						$divisions
						| sub("; note ?- .*$"; "")
						| sub("^.*([;:] (?=[^\\)]*(?:\\(|$)))"; "")
						| split(", (?=[^\\)]*(?:\\(|$))"; "g")
					end
				else [] end
				| map(sub("(\\*|//|;$)"; ""; "g"))
				| unique
			),
		}] as $countries
		| {
			countries: $countries
		}' >data/countries.json

	echo '{}' > data/flag-checksums.json
	codes=$(jq -r '.countries.[] | .code' data/countries.json)
	for code in $codes; do
		file=public/static/$code-flag.jpg

		fetch_flag() {
			echo Fetching $code flag...
			curl -Lfso public/static/$code-flag.jpg https://www.cia.gov/the-world-factbook/static/flags/$(echo $code | tr a-z A-Z)-flag.jpg
			[ ! -f $file ] && echo Failed to fetch $code
		}

		after_fetch() {
			cat <<<$(jq ".countries |= map(select(.code == \"$code\").flag |= \"/static/$code-flag.jpg\")" data/countries.json) > data/countries.json
			cat <<<$(jq ".$code |= \"$(sha256sum $file | cut -d' ' -f1)\"" data/flag-checksums.json) > data/flag-checksums.json
		}

		[ ! -f $file ] && fetch_flag
		[ -f $file ] && after_fetch
	done

	cat <<<$(jq 'to_entries | group_by(.value) | map(map(.key))' data/flag-checksums.json) > data/flag-groups.json
	for code in $codes; do
		repeats=$(jq "((.[] | select(index(\"$code\"))) // []) | del(.[] | select(. == \"$code\"))" data/flag-groups.json)
		cat <<<$(jq ".countries |= map(select(.code == \"$code\").flagRepeats |= $repeats)" data/countries.json) > data/countries.json
	done
}

[ ! -d data ] && mkdir data
[ ! -d data/factbook.json ] && git clone https://github.com/factbook/factbook.json data/factbook.json
[ ! -f data/countries.json ] && process
