#!/usr/bin/env sh

[ ! -f data/wikidata-query.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/query.sparql \
	-o data/wikidata-query.json

jq 'import "data/wikidata" as fetch; { countries: . | fetch::process }' data/wikidata-query.json >data/countries.json

for code in $(jq -r '.countries[] | .code' data/countries.json); do
	data=$(jq -r ".countries[] | select(.code == \"$code\")" data/countries.json)
	flag_uri=$(echo $data | jq -r ".flagImage.uri")
	flag_name_hash=$(echo $flag_uri | sha256sum | cut -c1-7)

	fetch_image() {
		echo Fetching: $flag_uri
		curl -sLf $flag_uri | npx svgo -i - -o public/static/$flag_name_hash.svg
		echo Done: $flag_uri
	}

	[ ! -f public/static/$flag_name_hash.svg ] && fetch_image

	geoshape_uri=$(echo $data | jq -r ".geo.uri")
	geoshape_uri_hash=$(echo $geoshape_uri | sha256sum | cut -c1-7)

	fetch_geoshape() {
		echo Fetching: $geoshape_uri
		# original uri was erroring with 404
		geoshape_uri="https://commons.wikimedia.org/w/index.php?action=raw&format=json&origin=*&title=$(echo $geoshape_uri | sed "s/^http:\/\/commons.wikimedia.org\/data\/main\///")"
		curl -Lfs $geoshape_uri -o public/static/$geoshape_uri_hash.json
		if [ -f public/static/$geoshape_uri_hash.json ]; then
			echo Done: $geoshape_uri
		else
			echo Error: $geoshape_uri
		fi
	}

	[ ! -f public/static/$geoshape_uri_hash.json ] && fetch_geoshape
	
	cat <<<$(jq ".countries |= map(select(.code == \"$code\") *= {
		flagImage: { localUri: \"/static/$flag_name_hash.svg\" },
		geo: { localUri: \"/static/$geoshape_uri_hash.json\" },
	})" data/countries.json) >data/countries.json
done
