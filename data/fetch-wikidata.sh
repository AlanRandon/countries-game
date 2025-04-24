#!/usr/bin/env sh

[ ! -f data/wikidata-query.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/query.sparql \
	-o data/wikidata-query.json

[ ! -f data/wikidata-query-divisions.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/query-divisions.sparql \
	-o data/wikidata-query-divisions.json

[ ! -f data/wikidata-query-borders.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/query-borders.sparql \
	-o data/wikidata-query-borders.json

jq \
	-s '.[0].results.bindings + .[1].results.bindings + .[2].results.bindings | group_by(.country) | map(.[0]*(.[1]//{})*(.[2]//{}))' \
	./data/wikidata-query.json ./data/wikidata-query-divisions.json ./data/wikidata-query-borders.json > ./data/wikidata-query-full.json

jq 'import "data/wikidata" as fetch; { countries: . | fetch::process }' data/wikidata-query-full.json >data/countries.json

for id in $(jq -r '.countries[] | .id' data/countries.json); do
	data=$(jq -r ".countries[] | select(.id == \"$id\")" data/countries.json)
	flag_uri=$(echo $data | jq -r ".flagImage.uri")
	flag_name_hash=$(echo $flag_uri | sha256sum | cut -c1-7)

	fetch_image() {
		echo Fetching: $flag_uri
		curl -sLf $flag_uri | npx svgo -i - -o public/static/$flag_name_hash.svg
		echo Done: $flag_uri
	}

	[ $flag_uri != "null" ] && [ ! -f public/static/$flag_name_hash.svg ] && fetch_image

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

	[ $geoshape_uri != "null" ] && [ ! -f public/static/$geoshape_uri_hash.json ] && fetch_geoshape

	geoshape_file=$(if [ $geoshape_uri != "null" ]; then echo \"/static/$geoshape_uri_hash.json\"; else echo null; fi)
	flag_file=$(if [ $flag_uri != "null" ]; then echo \"/static/$flag_name_hash.svg\"; else echo null; fi)
	
	cat <<<$(jq ".countries |= map(select(.id == \"$id\") *= {
		flagImage: { localUri: $flag_file },
		geo: { localUri: $geoshape_file },
	})" data/countries.json) >data/countries.json
done
