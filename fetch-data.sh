#!/usr/bin/env sh

process() {
	fd ".*\.json" data/factbook.json \
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
