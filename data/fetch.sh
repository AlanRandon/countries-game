#!/usr/bin/env sh

process() {
	fd ".*\.json" data/cache.factbook.json \
		| while read f; do jq . $f; done \
		| jq -s 'import "data/fetch" as fetch; { countries: [.[] | fetch::process] }' >data/countries.json

	echo {} >data/media-checksums.json
	codes=$(jq -r '.countries[] | .code' data/countries.json)
	for code in $codes; do
		for media in $(jq -c ".countries[] | select(.code == \"$code\").media | to_entries | map(. // empty) []" data/countries.json); do
			url=$(echo $media | jq -r .value.url)
			name=$(echo $url | sed "s/.*\///g")

			if [ "$(echo $media | jq -r .value.exists)" = "true" ]; then
				fetch() {
					echo Fetching $url
					curl -LfsO --output-dir public/static $url
				}

				[ ! -f public/static/$name ] && fetch

				key=$(echo $media | jq -r .key)
				cat <<<$(jq ".countries |= map(select(.code == \"$code\").media[\"$key\"] *= {
					localUrl: \"/static/$name\",
					hash: \"$(sha256sum public/static/$name | cut -d' ' -f1)\"
				})" data/countries.json)> data/countries.json
			fi
		done
	done
}

[ ! -d data ] && mkdir data
[ ! -d data/factbook.json ] && git clone https://github.com/factbook/factbook.json data/factbook.json
[ ! -d data/cache.factbook.json ] && git clone https://github.com/factbook/cache.factbook.json data/cache.factbook.json
[ ! -f data/countries.json ] && process
