#!/usr/bin/env sh

[ ! -f data/wikidata-query.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/query.sparql \
	-o data/wikidata-query.json

jq 'import "data/wikidata" as fetch; { countries: . | fetch::process }' data/wikidata-query.json >data/countries.json
